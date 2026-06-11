import AsyncStorage from '@react-native-async-storage/async-storage';

import { NewsItem, RecognitionResult, UserSession } from '../types';

const keys = {
  news: 'cotton.news.cache',
  history: 'cotton.recognition.history',
  session: 'cotton.user.session',
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
  clearSession: () => AsyncStorage.removeItem(keys.session),
  clearNews: () => AsyncStorage.removeItem(keys.news),
  clearHistory: () => AsyncStorage.removeItem(keys.history),
  clearRuntimeData: () => AsyncStorage.multiRemove([keys.news, keys.history]),
  clearAll: () =>
    AsyncStorage.multiRemove([keys.news, keys.history, keys.session]),
};
