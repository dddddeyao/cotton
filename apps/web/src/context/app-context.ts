import { createContext } from 'react';
import type { NewsItem, RecognitionResult, TabKey, UserSession } from '../types';

export type AppState = {
  activeTab: TabKey;
  news: NewsItem[];
  history: RecognitionResult[];
  session: UserSession | null;
  selectedImage: File | null;
  isRecognizing: boolean;
};

export type AppContextType = AppState & {
  setActiveTab: (tab: TabKey) => void;
  setNews: (news: NewsItem[]) => void;
  setHistory: (history: RecognitionResult[]) => void;
  setSession: (session: UserSession | null) => void;
  setSelectedImage: (file: File | null) => void;
  setIsRecognizing: (v: boolean) => void;
  addHistoryItem: (item: RecognitionResult) => void;
  removeHistoryItems: (ids: string[]) => void;
  clearHistory: () => void;
  clearCache: () => void;
  logout: () => void;
};

export const AppContext = createContext<AppContextType | null>(null);
