import { appConfig } from '../config';

export class ApiUnavailableError extends Error {
  constructor(message = 'API_BASE_URL 未配置') {
    super(message);
  }
}

export class ApiNetworkError extends Error {
  constructor(message = '网络请求失败') {
    super(message);
  }
}

function getSessionToken(): string | null {
  try {
    const raw = localStorage.getItem('session_cache');
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session?.token ?? null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeResponse<T>(body: unknown): T {
  if (!isRecord(body)) {
    return body as T;
  }

  if ('code' in body) {
    const code = Number(body.code);
    if (appConfig.successCodes.includes(code)) {
      return ('data' in body ? body.data : body) as T;
    }
    throw new Error(String(body.message || '请求失败'));
  }

  if ('data' in body) {
    return body.data as T;
  }

  return body as T;
}

function parseJsonSafely(rawText: string): unknown {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function readErrorMessage(body: unknown): string {
  if (!isRecord(body)) {
    return '';
  }

  return String(body.message || body.msg || '');
}

type RequestOptions = {
  timeout?: number;
  isFormData?: boolean;
  headers?: HeadersInit;
};

export async function requestJson<T>(
  path: string,
  options: RequestOptions & { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const { timeout = appConfig.requestTimeoutMs, isFormData = false, method = 'GET', body } = options;

  if (!appConfig.apiBaseUrl && appConfig.mockWhenApiUnavailable) {
    throw new ApiUnavailableError();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const headers = new Headers(options.headers);
  const token = getSessionToken();
  if (token) {
    headers.set(appConfig.auth.tokenHeader, `${appConfig.auth.tokenPrefix} ${token}`);
  }

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    let res: Response;
    try {
      res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
        method,
        headers,
        body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiNetworkError('请求超时，请稍后重试');
      }
      throw new ApiNetworkError();
    }

    const rawText = await res.text();
    const json = parseJsonSafely(rawText);

    if (!res.ok) {
      const message = readErrorMessage(json);
      throw new Error(message || `HTTP ${res.status}`);
    }

    return normalizeResponse(json);
  } finally {
    clearTimeout(timer);
  }
}

export async function requestWithMock<T>(
  path: string,
  mockData: T,
  options: RequestOptions & { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  try {
    return await requestJson<T>(path, options);
  } catch (error) {
    if (
      appConfig.mockWhenApiUnavailable &&
      (error instanceof ApiUnavailableError || error instanceof ApiNetworkError)
    ) {
      return mockData;
    }
    throw error;
  }
}
