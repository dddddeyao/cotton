import { RecognitionUploadFieldName } from './types';

declare const process: {
  env?: {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_REQUEST_TIMEOUT_MS?: string;
    EXPO_PUBLIC_RECOGNITION_TIMEOUT_MS?: string;
    EXPO_PUBLIC_MOCK_WHEN_API_UNAVAILABLE?: string;
    EXPO_PUBLIC_RECOGNITION_UPLOAD_FIELD_NAME?: string;
  };
};

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function trimTrailingSlash(value: string | undefined) {
  return value ? value.replace(/\/+$/, '') : '';
}

export const appConfig = {
  apiBaseUrl: trimTrailingSlash(process.env?.EXPO_PUBLIC_API_BASE_URL),
  requestTimeoutMs: readNumber(process.env?.EXPO_PUBLIC_REQUEST_TIMEOUT_MS, 15000),
  recognitionTimeoutMs: readNumber(process.env?.EXPO_PUBLIC_RECOGNITION_TIMEOUT_MS, 30000),
  mockWhenApiUnavailable: readBoolean(process.env?.EXPO_PUBLIC_MOCK_WHEN_API_UNAVAILABLE, true),
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
    recognition: '/recognition?images=0',
    recognitionBase64: '/recognition/base64?images=0',
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


