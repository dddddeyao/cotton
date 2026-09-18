import { appConfig, getApiBaseUrl } from '../config';

type RequestJsonOptions = {
  method?: string;
  body?: BodyInit | FormData | string;
  headers?: HeadersInit;
  token?: string;
  timeoutMs?: number;
};

type ApiEnvelope<T> = {
  code?: number | string;
  status?: number | string;
  message?: string;
  msg?: string;
  data?: T;
  result?: T;
};

export class ApiUnavailableError extends Error {
  constructor() {
    super('尚未配置服务器地址，请先在「应用设置 → 服务器地址」中填写。');
  }
}

export class ApiNetworkError extends Error {
  constructor(message = '网络请求失败') {
    super(message);
  }
}

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

function buildUrl(path: string) {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '';
}

function readEnvelopeMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const envelope = payload as ApiEnvelope<unknown>;
  return envelope.message || envelope.msg || '';
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

function unwrapEnvelope<T>(payload: unknown): T {
  if (!payload || typeof payload !== 'object') {
    return payload as T;
  }

  const envelope = payload as ApiEnvelope<T>;
  const rawCode = envelope.code ?? envelope.status;

  if (rawCode !== undefined) {
    const code = Number(rawCode);
    if (!appConfig.successCodes.includes(code)) {
      throw new Error(readEnvelopeMessage(payload) || '请求失败');
    }

    return (envelope.data ?? envelope.result ?? payload) as T;
  }

  return payload as T;
}

export async function requestJson<T>(path: string, options: RequestJsonOptions = {}): Promise<T> {
  if (!getApiBaseUrl()) {
    throw new ApiUnavailableError();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? appConfig.requestTimeoutMs,
  );

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.token) {
    const prefix = appConfig.auth.tokenPrefix ? `${appConfig.auth.tokenPrefix} ` : '';
    headers.set(appConfig.auth.tokenHeader, `${prefix}${options.token}`);
  }

  if (options.body && !isFormData(options.body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const requestUrl = buildUrl(path);

  try {
    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: options.method ?? 'GET',
        body: options.body as BodyInit | undefined,
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiNetworkError('请求超时，请稍后重试');
      }

      const detail = errorMessage(error);
      throw new ApiNetworkError(detail ? `网络请求失败：${detail}（${requestUrl}）` : `网络请求失败（${requestUrl}）`);
    }

    const rawText = await response.text();
    const payload = parseJsonSafely(rawText);

    if (!response.ok) {
      throw new Error(readEnvelopeMessage(payload) || `HTTP ${response.status}`);
    }

    return unwrapEnvelope<T>(payload);
  } finally {
    clearTimeout(timeoutId);
  }
}
