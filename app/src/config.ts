import { RecognitionUploadFieldName } from './types';

export const appConfig = {
  apiBaseUrl: 'http://localhost:8080',
  requestTimeoutMs: 15000,
  recognitionTimeoutMs: 30000,
  mockWhenApiUnavailable: true,
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
    uploadFieldName: 'file' as RecognitionUploadFieldName,
    defaultFileName: 'cotton-sample.jpg',
    defaultMimeType: 'image/jpeg',
  },
  successCodes: [0, 200],
};
