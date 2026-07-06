import { appConfig } from '../config';
import { createMockRecognitionResult, mockNews } from '../data/mockData';
import { cache } from '../storage/cache';
import { NewsItem, RecognitionResult, UserProfile, UserSession } from '../types';
import { ApiNetworkError, ApiUnavailableError, requestJson } from './http';
import {
  normalizeNewsList,
  normalizeProfile,
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
  return appConfig.mockWhenApiUnavailable
    && (!appConfig.apiBaseUrl || error instanceof ApiUnavailableError || error instanceof ApiNetworkError);
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

function createImageBase64Body(imageUri: string, imageBase64: string) {
  const fileName = getFileNameFromUri(imageUri);

  return JSON.stringify({
    imageBase64,
    filename: fileName,
    contentType: guessMimeType(fileName),
  });
}
function createLocalProfile(
  username: string,
  profile: Partial<Omit<UserProfile, 'username'>> = {}
): UserProfile {
  return {
    username,
    nickname: profile.nickname || '',
    phone: profile.phone || '',
    organization: profile.organization || '',
    role: profile.role || '研究人员',
  };
}

export const api = {
  async fetchNews(): Promise<NewsItem[]> {
    try {
      const payload = await requestJson<unknown>(appConfig.endpoints.news);
      const normalized = normalizeNewsList(payload);
      return normalized.length > 0 ? normalized : mockNews;
    } catch (error) {
      if (shouldUseMock(error)) {
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

      if (!session.token) {
        throw new Error('注册接口未返回 token');
      }

      return {
        username: session.username || username,
        token: session.token,
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

  async changePassword(oldPassword: string, newPassword: string, token: string): Promise<void> {
    try {
      await requestJson(appConfig.endpoints.changePassword, {
        method: 'POST',
        token,
        body: JSON.stringify({ oldPassword, newPassword }),
      });
    } catch (error) {
      if (shouldUseMock(error)) {
        return;
      }

      throw error;
    }
  },

  async fetchProfile(session: UserSession): Promise<UserProfile> {
    try {
      const payload = await requestJson<unknown>(appConfig.endpoints.userProfile, {
        token: session.token,
      });
      const profile = normalizeProfile(payload, session.username);
      await cache.setProfile(session.username, {
        nickname: profile.nickname,
        phone: profile.phone,
        organization: profile.organization,
        role: profile.role,
      });
      return profile;
    } catch (error) {
      if (shouldUseMock(error)) {
        const cachedProfile = await cache.getProfile(session.username);
        return createLocalProfile(session.username, cachedProfile ?? {});
      }

      throw error;
    }
  },

  async updateProfile(session: UserSession, profile: Omit<UserProfile, 'username'>): Promise<UserProfile> {
    try {
      const payload = await requestJson<unknown>(appConfig.endpoints.userProfile, {
        method: 'PUT',
        token: session.token,
        body: JSON.stringify(profile),
      });
      const savedProfile = normalizeProfile(payload, session.username);
      await cache.setProfile(session.username, {
        nickname: savedProfile.nickname,
        phone: savedProfile.phone,
        organization: savedProfile.organization,
        role: savedProfile.role,
      });
      return savedProfile;
    } catch (error) {
      if (shouldUseMock(error)) {
        await cache.setProfile(session.username, profile);
        return createLocalProfile(session.username, profile);
      }

      throw error;
    }
  },

  async recognizeImage(imageUri: string, token?: string, imageBase64?: string): Promise<RecognitionResult> {
    if (!imageUri) {
      throw new Error('请先选择图片');
    }

    try {
      const payload = imageBase64
        ? await requestJson<unknown>(appConfig.endpoints.recognitionBase64, {
            method: 'POST',
            body: createImageBase64Body(imageUri, imageBase64),
            token,
            timeoutMs: appConfig.recognitionTimeoutMs,
          })
        : await requestJson<unknown>(appConfig.endpoints.recognition, {
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
    try {
      const payload = await requestJson<unknown>(appConfig.endpoints.recognitionHistory, { token });
      return normalizeRecognitionHistory(payload);
    } catch (error) {
      if (shouldUseMock(error)) {
        return [];
      }

      throw error;
    }
  },

  async deleteHistory(ids: string[], token: string): Promise<void> {
    const normalizedIds = ids
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (normalizedIds.length === 0) {
      return;
    }

    try {
      await requestJson(appConfig.endpoints.recognitionHistory, {
        method: 'DELETE',
        token,
        body: JSON.stringify({ ids: normalizedIds }),
      });
    } catch (error) {
      if (shouldUseMock(error)) {
        return;
      }

      throw error;
    }
  },
};


