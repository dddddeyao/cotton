import AsyncStorage from '@react-native-async-storage/async-storage';

import { NewsItem, RecognitionResult, UserProfile, UserSession } from '../types';

type ProfileCache = Omit<UserProfile, 'username'>;

const keys = {
  news: 'cotton.news.cache',
  history: 'cotton.recognition.history',
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

export const cache = {
  getNews: () => readJson<NewsItem[]>(keys.news, []),
  setNews: (items: NewsItem[]) => writeJson(keys.news, items),
  getHistory: () => readJson<RecognitionResult[]>(keys.history, []),
  setHistory: (items: RecognitionResult[]) => writeJson(keys.history, items),
  getSession: () => readJson<UserSession | null>(keys.session, null),
  setSession: (session: UserSession) => writeJson(keys.session, session),
  getProfile: (username: string) => readJson<ProfileCache | null>(keys.profile(username), null),
  setProfile: (username: string, profile: ProfileCache) => writeJson(keys.profile(username), profile),
  clearSession: () => AsyncStorage.removeItem(keys.session),
  clearNews: () => AsyncStorage.removeItem(keys.news),
  clearHistory: () => AsyncStorage.removeItem(keys.history),
  clearRuntimeData: () => AsyncStorage.multiRemove([keys.news, keys.history]),
  clearAll: () =>
    AsyncStorage.multiRemove([keys.news, keys.history, keys.session]),
};
