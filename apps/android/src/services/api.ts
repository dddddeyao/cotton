import { appConfig } from '../config';
import { createMockRecognitionResult, mockNews } from '../data/mockData';
import { NewsItem, RecognitionResult, UserSession } from '../types';
import { ApiUnavailableError, requestJson } from './http';
import {
  normalizeNewsList,
  normalizeRecognitionHistory,
  normalizeRecognitionResult,
  normalizeSession,
} from './normalizers';

type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

function shouldUseMock(error: unknown) {
  return appConfig.mockWhenApiUnavailable && (!appConfig.apiBaseUrl || error instanceof ApiUnavailableError);
}

function getFileNameFromUri(uri: string) {
  const cleanUri = uri.split('?')[0] ?? uri;
  const fileName = cleanUri.split('/').filter(Boolean).pop();
  return fileName || appConfig.recognition.defaultFileName;
}

function guessMimeType(fileName: string) {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerName.endsWith('.webp')) {
    return 'image/webp';
  }

  return appConfig.recognition.defaultMimeType;
}

function createImageFormData(imageUri: string) {
  const fileName = getFileNameFromUri(imageUri);
  const uploadFile: UploadFile = {
    uri: imageUri,
    name: fileName,
    type: guessMimeType(fileName),
  };
  const formData = new FormData();

  formData.append(appConfig.recognition.uploadFieldName, uploadFile as unknown as Blob);
  return formData;
}

export const api = {
  async fetchNews(): Promise<NewsItem[]> {
    try {
      const payload = await requestJson<unknown>(appConfig.endpoints.news);
      const normalized = normalizeNewsList(payload);
      return normalized.length > 0 ? normalized : mockNews;
    } catch (error) {
      if (appConfig.mockWhenApiUnavailable) {
        return mockNews;
      }

      throw error;
    }
  },

  async login(username: string, password: string): Promise<UserSession> {
    if (!username || !password) {
      throw new Error('请输入账号和密码');
    }

    try {
      const payload = await requestJson<unknown>(appConfig.endpoints.login, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      const session = normalizeSession(payload, username);

      if (!session.token) {
        throw new Error('登录接口未返回 token');
      }

      return session;
    } catch (error) {
      if (shouldUseMock(error)) {
        return {
          username,
          token: `mock-token-${Date.now()}`,
        };
      }

      throw error;
    }
  },

  async register(username: string, password: string): Promise<UserSession> {
    if (!username || !password) {
      throw new Error('请输入用户名和密码');
    }

    try {
      const payload = await requestJson<unknown>(appConfig.endpoints.register, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      const session = normalizeSession(payload, username);

      return {
        username: session.username || username,
        token: session.token || `registered-${Date.now()}`,
      };
    } catch (error) {
      if (shouldUseMock(error)) {
        return {
          username,
          token: `mock-token-${Date.now()}`,
        };
      }

      throw error;
    }
  },

  async logout(token?: string): Promise<void> {
    if (!token) {
      return;
    }

    try {
      await requestJson<unknown>(appConfig.endpoints.logout, {
        method: 'POST',
        token,
      });
    } catch (error) {
      if (shouldUseMock(error)) {
        return;
      }

      throw error;
    }
  },

  async recognizeImage(imageUri: string, token?: string): Promise<RecognitionResult> {
    if (!imageUri) {
      throw new Error('请先选择图片');
    }

    try {
      const payload = await requestJson<unknown>(appConfig.endpoints.recognition, {
        method: 'POST',
        body: createImageFormData(imageUri),
        token,
        timeoutMs: appConfig.recognitionTimeoutMs,
      });

      return normalizeRecognitionResult(payload, imageUri);
    } catch (error) {
      if (shouldUseMock(error)) {
        return createMockRecognitionResult(imageUri);
      }

      throw error;
    }
  },

  async fetchHistory(token: string): Promise<RecognitionResult[]> {
    const payload = await requestJson<unknown>(appConfig.endpoints.recognitionHistory, { token });
    return normalizeRecognitionHistory(payload);
  },

  async deleteHistory(ids: string[], token: string): Promise<void> {
    const normalizedIds = ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    await requestJson(appConfig.endpoints.recognitionHistory, {
      method: 'DELETE',
      token,
      body: JSON.stringify({ ids: normalizedIds }),
    });
  },
};
