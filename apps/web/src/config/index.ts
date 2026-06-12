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
  apiBaseUrl: trimTrailingSlash(import.meta.env.VITE_API_BASE_URL),
  requestTimeoutMs: readNumber(import.meta.env.VITE_REQUEST_TIMEOUT_MS, 15000),
  recognitionTimeoutMs: readNumber(import.meta.env.VITE_RECOGNITION_TIMEOUT_MS, 30000),
  mockWhenApiUnavailable: readBoolean(import.meta.env.VITE_MOCK_WHEN_API_UNAVAILABLE, true),

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
    recognition: '/recognition',
    recognitionHistory: '/recognition/history',
    userProfile: '/user/profile',
  },

  recognition: {
    uploadFieldName: import.meta.env.VITE_RECOGNITION_UPLOAD_FIELD_NAME || 'file',
    defaultFileName: 'cotton-sample.jpg',
    defaultMimeType: 'image/jpeg',
  },

  successCodes: [0, 200],
};
