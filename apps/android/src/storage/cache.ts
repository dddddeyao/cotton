import AsyncStorage from '@react-native-async-storage/async-storage';

import { NewsItem, RecognitionResult, UserProfile, UserSession } from '../types';

type ProfileCache = Omit<UserProfile, 'username'>;

const NEWS_CACHE_LIMIT = 100;
const legacyHistoryKey = 'cotton.recognition.history';

function normalizeScope(scope?: string | null) {
  const value = (scope || 'guest').trim().toLowerCase();
  return value.replace(/[^a-z0-9._-]/g, '_') || 'guest';
}

const keys = {
  news: 'cotton.news.cache',
  history: (scope?: string | null) => `cotton.recognition.history.${normalizeScope(scope)}`,
  session: 'cotton.user.session',
  profile: (username: string) => `cotton.user.profile.${username}`,
};

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getScopedHistory(scope?: string | null) {
  const scopedKey = keys.history(scope);
  const scopedHistory = await readJson<RecognitionResult[]>(scopedKey, []);
  if (scopedHistory.length > 0 || normalizeScope(scope) !== 'guest') {
    return scopedHistory;
  }

  return readJson<RecognitionResult[]>(legacyHistoryKey, []);
}

export const cache = {
  getNews: () => readJson<NewsItem[]>(keys.news, []),
  setNews: (items: NewsItem[]) => writeJson(keys.news, items.slice(0, NEWS_CACHE_LIMIT)),
  getHistory: (scope?: string | null) => getScopedHistory(scope),
  setHistory: (items: RecognitionResult[], scope?: string | null) => writeJson(keys.history(scope), items),
  getSession: () => readJson<UserSession | null>(keys.session, null),
  setSession: (session: UserSession) => writeJson(keys.session, session),
  getProfile: (username: string) => readJson<ProfileCache | null>(keys.profile(username), null),
  setProfile: (username: string, profile: ProfileCache) => writeJson(keys.profile(username), profile),
  clearSession: () => AsyncStorage.removeItem(keys.session),
  clearNews: () => AsyncStorage.removeItem(keys.news),
  clearHistory: (scope?: string | null) => AsyncStorage.removeItem(keys.history(scope)),
  clearRuntimeData: (scope?: string | null) => AsyncStorage.multiRemove([keys.news, keys.history(scope)]),
  clearAll: () => AsyncStorage.multiRemove([keys.news, keys.history(), keys.session, legacyHistoryKey]),
};