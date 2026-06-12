import { useState, useEffect, useCallback, type ReactNode } from 'react';
import type { TabKey, NewsItem, RecognitionResult, UserSession } from '../types';
import { api } from '../api';
import { AppContext } from './app-context';

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabKey>('news');
  const [news, setNews] = useState<NewsItem[]>(() => readCache('news_cache', []));
  const [history, setHistory] = useState<RecognitionResult[]>(() => readCache('history_cache', []));
  const [session, setSessionState] = useState<UserSession | null>(() => readCache('session_cache', null));
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);

  useEffect(() => {
    api.fetchNews().then((data) => {
      setNews(data);
      localStorage.setItem('news_cache', JSON.stringify(data));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    localStorage.setItem('history_cache', JSON.stringify(history));
  }, [history]);

  const setSession = useCallback((s: UserSession | null) => {
    setSessionState(s);
    if (s) {
      localStorage.setItem('session_cache', JSON.stringify(s));
    } else {
      localStorage.removeItem('session_cache');
    }
  }, []);

  const addHistoryItem = useCallback((item: RecognitionResult) => {
    setHistory((prev) => [item, ...prev]);
  }, []);

  const removeHistoryItems = useCallback((ids: string[]) => {
    setHistory((prev) => prev.filter((h) => !ids.includes(h.id)));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('history_cache');
  }, []);

  const clearCache = useCallback(() => {
    localStorage.removeItem('news_cache');
    localStorage.removeItem('history_cache');
    setNews([]);
    setHistory([]);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      localStorage.removeItem('session_cache');
    }
    setSession(null);
  }, [setSession]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        news,
        history,
        session,
        selectedImage,
        isRecognizing,
        setActiveTab,
        setNews,
        setHistory,
        setSession,
        setSelectedImage,
        setIsRecognizing,
        addHistoryItem,
        removeHistoryItems,
        clearHistory,
        clearCache,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
