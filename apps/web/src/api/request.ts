import { appConfig } from '../config';

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

type RequestOptions = {
  timeout?: number;
  isFormData?: boolean;
};

export async function requestJson<T>(
  path: string,
  options: RequestOptions & { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {}
): Promise<T> {
  const { timeout = appConfig.requestTimeoutMs, isFormData = false, method = 'GET', body } = options;

  if (!appConfig.apiBaseUrl && appConfig.mockWhenApiUnavailable) {
    throw new Error('MOCK_NOT_AVAILABLE');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const headers: Record<string, string> = {};
  const token = getSessionToken();
  if (token) {
    headers[appConfig.auth.tokenHeader] = `${appConfig.auth.tokenPrefix} ${token}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${appConfig.apiBaseUrl}${path}`, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json: unknown = await res.json();
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
  } catch {
    if (appConfig.mockWhenApiUnavailable) {
      return mockData;
    }
    throw new Error('网络请求失败');
  }
}
