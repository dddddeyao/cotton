import { RecognitionUploadFieldName } from './types';

declare const process: {
  env?: {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_REQUEST_TIMEOUT_MS?: string;
    EXPO_PUBLIC_RECOGNITION_TIMEOUT_MS?: string;
    EXPO_PUBLIC_RECOGNITION_UPLOAD_FIELD_NAME?: string;
  };
};

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}


function trimTrailingSlash(value: string | undefined) {
  return value ? value.replace(/\/+$/, '') : '';
}

export const appConfig = {
  apiBaseUrl: trimTrailingSlash(process.env?.EXPO_PUBLIC_API_BASE_URL),
  requestTimeoutMs: readNumber(process.env?.EXPO_PUBLIC_REQUEST_TIMEOUT_MS, 15000),
  recognitionTimeoutMs: readNumber(process.env?.EXPO_PUBLIC_RECOGNITION_TIMEOUT_MS, 30000),
  auth: {
    tokenHeader: 'Authorization',
    tokenPrefix: 'Bearer',
  },
  endpoints: {
    login: '/auth/login',
    logout: '/auth/logout',
    register: '/auth/register',
    changePassword: '/auth/change-password',
    news: '/news',
    recognition: '/recognition?images=1',
    recognitionBase64: '/recognition/base64?images=1',
    recognitionHistory: '/recognition/history',
    userProfile: '/user/profile',
  },
  recognition: {
    uploadFieldName: (process.env?.EXPO_PUBLIC_RECOGNITION_UPLOAD_FIELD_NAME ||
      'file') as RecognitionUploadFieldName,
    defaultFileName: 'cotton-sample.jpg',
    defaultMimeType: 'image/jpeg',
  },
  successCodes: [0, 200],
};

// ── 运行时可覆盖的后端地址 ──
// appConfig.apiBaseUrl 是编译期默认值（EXPO_PUBLIC_API_BASE_URL）；
// 用户在 App 内填写的地址保存在本地，启动时覆盖默认值，从而无需重新打包。
let runtimeApiBaseUrl = '';

export function setRuntimeApiBaseUrl(url: string) {
  runtimeApiBaseUrl = trimTrailingSlash(url);
}

export function getApiBaseUrl(): string {
  return runtimeApiBaseUrl || appConfig.apiBaseUrl;
}

export function getDefaultApiBaseUrl(): string {
  return appConfig.apiBaseUrl;
}


