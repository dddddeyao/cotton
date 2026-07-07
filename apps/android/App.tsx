import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  AppStateStatus,
  BackHandler,
  Platform,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  StyleSheet,
} from 'react-native';

import { TabShell } from './src/components/TabShell';
import { NewsScreen } from './src/screens/NewsScreen';
import { NewsDetailScreen } from './src/screens/NewsDetailScreen';
import { StandardsScreen } from './src/screens/StandardsScreen';
import { RecognitionScreen } from './src/screens/RecognitionScreen';
import { RecognitionResultScreen } from './src/screens/RecognitionResultScreen';
import { RecognitionHistoryScreen } from './src/screens/RecognitionHistoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SimplePage } from './src/screens/SimplePage';
import { LaunchScreen } from './src/screens/LaunchScreen';
import { appConfig } from './src/config';
import { api } from './src/services/api';
import { cache } from './src/storage/cache';
import { colors } from './src/theme';
import { AppView, NewsItem, RecognitionResult, TabKey, UserSession } from './src/types';

const NEWS_REFRESH_INTERVAL_MS = 3 * 60 * 1000;
const NEWS_PAGE_SIZE = 10;
const NEWS_CACHE_LIMIT = 100;

function getNewsKey(item: NewsItem) {
  return item.id || item.sourceUrl || `${item.title}-${item.date}`;
}

function getNewsTimeValue(item: NewsItem) {
  const normalizedDate = item.date
    .replace(/[年月.]/g, '-')
    .replace(/日/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const dateValue = Date.parse(normalizedDate);

  if (Number.isFinite(dateValue)) {
    return dateValue;
  }

  const idValue = Number(item.id);
  return Number.isFinite(idValue) ? idValue : 0;
}

function sortNewsNewestFirst(items: NewsItem[]) {
  return items
    .map((item, index) => ({ item, index, time: getNewsTimeValue(item) }))
    .sort((left, right) => {
      if (left.time !== right.time) {
        return right.time - left.time;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}

function limitNewsCache(items: NewsItem[]) {
  return sortNewsNewestFirst(items).slice(0, NEWS_CACHE_LIMIT);
}

function mergeNewsLists(primary: NewsItem[], secondary: NewsItem[]) {
  const seen = new Set<string>();
  const merged: NewsItem[] = [];

  for (const item of [...primary, ...secondary]) {
    const key = getNewsKey(item);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(item);
  }

  return limitNewsCache(merged);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '请检查网络后重试。';
}

function imageUriScheme(uri: string) {
  const separatorIndex = uri.indexOf(':');
  return separatorIndex > 0 ? uri.slice(0, separatorIndex) : 'unknown';
}

const androidStatusBarFallback = 24;
const androidTopInset =
  Platform.OS === 'android' ? Math.max(NativeStatusBar.currentHeight ?? 0, androidStatusBarFallback) : 0;
export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('news');
  const [view, setView] = useState<AppView>({ name: 'tabs' });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [history, setHistory] = useState<RecognitionResult[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [selectedImageBase64, setSelectedImageBase64] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isLaunchFinished, setIsLaunchFinished] = useState(false);
  const [isNewsRefreshing, setIsNewsRefreshing] = useState(false);
  const [isNewsLoadingMore, setIsNewsLoadingMore] = useState(false);
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [newsUpdatedAt, setNewsUpdatedAt] = useState<number | null>(null);
  const newsRef = useRef<NewsItem[]>([]);
  const newsPageRef = useRef(1);
  const newsRefreshInFlightRef = useRef(false);
  const newsLoadMoreInFlightRef = useRef(false);
  const lastNewsRefreshAttemptRef = useRef(0);

  const saveNews = useCallback((items: NewsItem[]) => {
    const boundedItems = limitNewsCache(items);
    newsRef.current = boundedItems;
    setNews(boundedItems);
    void cache.setNews(boundedItems);
  }, []);

  const refreshNews = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    const now = Date.now();

    if (newsRefreshInFlightRef.current) {
      return;
    }

    if (!force && now - lastNewsRefreshAttemptRef.current < NEWS_REFRESH_INTERVAL_MS) {
      return;
    }

    newsRefreshInFlightRef.current = true;
    lastNewsRefreshAttemptRef.current = now;
    setIsNewsRefreshing(true);

    try {
      const refreshedNews = await api.fetchNews({ page: 1, size: NEWS_PAGE_SIZE });

      if (refreshedNews.length > 0) {
        saveNews(mergeNewsLists(refreshedNews, newsRef.current));
        newsPageRef.current = 1;
      }

      setHasMoreNews(refreshedNews.length >= NEWS_PAGE_SIZE);
      setNewsUpdatedAt(Date.now());
    } catch {
      // Keep cached data when the configured API rejects the refresh.
    } finally {
      newsRefreshInFlightRef.current = false;
      setIsNewsRefreshing(false);
    }
  }, [saveNews]);

  const loadMoreNews = useCallback(async () => {
    if (newsLoadMoreInFlightRef.current || newsRefreshInFlightRef.current || !hasMoreNews) {
      return;
    }

    newsLoadMoreInFlightRef.current = true;
    setIsNewsLoadingMore(true);

    try {
      const nextPage = newsPageRef.current + 1;
      const nextNews = await api.fetchNews({ page: nextPage, size: NEWS_PAGE_SIZE });

      if (nextNews.length > 0) {
        saveNews(mergeNewsLists(newsRef.current, nextNews));
        newsPageRef.current = nextPage;
      }

      setHasMoreNews(nextNews.length >= NEWS_PAGE_SIZE);
    } catch {
      // Keep the visible cached list if loading more fails.
    } finally {
      newsLoadMoreInFlightRef.current = false;
      setIsNewsLoadingMore(false);
    }
  }, [hasMoreNews, saveNews]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const [cachedNews, cachedHistory, cachedSession] = await Promise.all([
          cache.getNews(),
          cache.getHistory(),
          cache.getSession(),
        ]);

        if (!isMounted) {
          return;
        }

        if (cachedNews.length > 0) {
          saveNews(cachedNews);
          setHasMoreNews(cachedNews.length >= NEWS_PAGE_SIZE);
          newsPageRef.current = Math.max(1, Math.ceil(cachedNews.length / NEWS_PAGE_SIZE));
        }

        if (cachedHistory.length > 0) {
          setHistory(cachedHistory);
        }

        setSession(cachedSession);
      } finally {
        if (isMounted) {
          setIsBootstrapped(true);
        }
      }

      if (isMounted) {
        void refreshNews({ force: true });
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [refreshNews, saveNews]);

  useEffect(() => {
    if (view.name !== 'tabs' || activeTab !== 'news') {
      return undefined;
    }

    void refreshNews();
    const interval = setInterval(() => {
      void refreshNews();
    }, NEWS_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [activeTab, refreshNews, view.name]);

  useEffect(() => {
    let previousState: AppStateStatus = AppState.currentState;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackgrounded = previousState === 'background' || previousState === 'inactive';
      const isForegrounded = nextState === 'active';

      previousState = nextState;

      if (wasBackgrounded && isForegrounded) {
        void refreshNews({ force: true });
      }
    });

    return () => subscription.remove();
  }, [refreshNews]);

  const saveHistory = useCallback((items: RecognitionResult[]) => {
    setHistory(items);
    void cache.setHistory(items);
  }, []);

  const openTabs = useCallback(() => {
    setView({ name: 'tabs' });
  }, []);

  useEffect(() => {
    if (view.name === 'tabs') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      openTabs();
      return true;
    });

    return () => subscription.remove();
  }, [openTabs, view.name]);

  const openRecognitionHistory = useCallback(async () => {
    if (session?.token) {
      try {
        const remoteHistory = await api.fetchHistory(session.token);
        saveHistory(remoteHistory);
      } catch {
        // 未配置历史接口时继续展示本地临时记录。
      }
    }

    setView({ name: 'recognitionHistory' });
  }, [saveHistory, session?.token]);

  const handleLogout = useCallback(async () => {
    if (!session) {
      Alert.alert('当前未登录', '没有需要退出的账号。');
      return;
    }

    if (isLoggingOut) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await api.logout(session.token);
      await cache.clearSession();
      setSession(null);
      setActiveTab('profile');
      openTabs();
      Alert.alert('已退出登录', '当前账号登录状态已清除。');
    } catch (error) {
      Alert.alert('退出失败', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, openTabs, session]);

  const confirmLogout = useCallback(() => {
    if (!session) {
      Alert.alert('当前未登录', '没有需要退出的账号。');
      return;
    }

    if (isLoggingOut) {
      return;
    }

    Alert.alert('退出登录', `确认退出账号 ${session.username}？`, [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: () => void handleLogout() },
    ]);
  }, [handleLogout, isLoggingOut, session]);

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('权限未开启', source === 'camera' ? '请允许相机权限后再拍照。' : '请允许相册权限后再选择图片。');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            quality: 0.9,
            base64: true,
          });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
      setSelectedImageBase64(result.assets[0].base64 ?? '');
      setActiveTab('recognition');
      setView({ name: 'tabs' });
    }
  }, []);

  const recognizeSelectedImage = useCallback(async () => {
    if (!selectedImageUri) {
      Alert.alert('请先选择图片', '可以拍照，也可以从相册选择一张棉花图片。');
      return;
    }

    try {
      setIsRecognizing(true);
      const result = await api.recognizeImage(selectedImageUri, session?.token, selectedImageBase64);
      const nextHistory = [result, ...history];
      saveHistory(nextHistory);
      setView({ name: 'recognitionResult', result });
    } catch (error) {
      Alert.alert(
        '检测失败',
        [
          getErrorMessage(error),
          `接口：${appConfig.apiBaseUrl}${appConfig.endpoints.recognition}`,
          `图片来源：${imageUriScheme(selectedImageUri)}`,
          `登录状态：${session?.token ? '已登录' : '未登录'}`,
        ].join('\n'),
      );
    } finally {
      setIsRecognizing(false);
    }
  }, [history, saveHistory, selectedImageBase64, selectedImageUri, session?.token]);

  function renderScreen() {
    if (view.name === 'newsDetail') {
      return <NewsDetailScreen item={view.item} onBack={openTabs} />;
    }

    if (view.name === 'recognitionResult') {
      const backToHistory = view.returnTo === 'history';

      return (
        <RecognitionResultScreen
          result={view.result}
          onBack={() => {
            if (backToHistory) {
              setView({ name: 'recognitionHistory' });
              return;
            }

            setActiveTab('recognition');
            openTabs();
          }}
          onRetry={() => {
            setActiveTab('recognition');
            setSelectedImageUri('');
            setSelectedImageBase64('');
            openTabs();
          }}
        />
      );
    }

    if (view.name === 'recognitionHistory') {
      return (
        <RecognitionHistoryScreen
          history={history}
          onBack={openTabs}
          onOpenResult={(result) => setView({ name: 'recognitionResult', result, returnTo: 'history' })}
          onDelete={async (ids) => {
            const remoteIds = history.filter((item) => ids.includes(item.id) && !item.isLocal).map((item) => item.id);

            if (session?.token && remoteIds.length > 0) {
              try {
                await api.deleteHistory(remoteIds, session.token);
              } catch (error) {
                Alert.alert('删除失败', error instanceof Error ? error.message : '请稍后重试。');
                return;
              }
            }

            saveHistory(history.filter((item) => !ids.includes(item.id)));
          }}
        />
      );
    }

    if (view.name === 'editProfile') {
      return <EditProfileScreen session={session} onBack={openTabs} onRequireLogin={() => setActiveTab('profile')} />;
    }


    if (view.name === 'settings') {
      return (
        <SettingsScreen
          session={session}
          onBack={openTabs}
          onClearCache={async () => {
            await cache.clearRuntimeData();
            newsRef.current = [];
            newsPageRef.current = 1;
            setHasMoreNews(true);
            setNews([]);
            setHistory([]);
            Alert.alert('已清理', '缓存新闻和本地临时检测记录已清理，登录状态已保留。');
          }}
          onLogout={confirmLogout}
          isLoggingOut={isLoggingOut}
        />
      );
    }

    if (view.name === 'agreement') {
      const body =
        view.kind === 'user'
          ? '本系统用于棉花图像样本的颜色级、叶屑等级与相关指标展示，检测结果应结合分类标准与人工复核使用。用户应妥善保管账号信息，并遵守项目数据使用要求。'
          : '应用会在本地缓存新闻、检测记录和登录会话。配置后端后，图片会通过检测接口上传，认证信息以 Authorization Bearer Token 形式发送。应用仅保存完成展示和账号功能所需的数据。';

      return (
        <SimplePage
          title={view.kind === 'user' ? '用户协议' : '隐私政策'}
          onBack={openTabs}
          body={body}
          variant="document"
        />
      );
    }

    return (
      <TabShell activeTab={activeTab} onChangeTab={setActiveTab}>
        {activeTab === 'news' ? (
          <NewsScreen
            news={news}
            isRefreshing={isNewsRefreshing}
            updatedAt={newsUpdatedAt}
            isLoadingMore={isNewsLoadingMore}
            hasMore={hasMoreNews}
            onRefresh={() => refreshNews({ force: true })}
            onLoadMore={loadMoreNews}
            onOpenNews={(item) => setView({ name: 'newsDetail', item })}
          />
        ) : null}
        {activeTab === 'standards' ? <StandardsScreen /> : null}
        {activeTab === 'recognition' ? (
          <RecognitionScreen
            imageUri={selectedImageUri}
            isRecognizing={isRecognizing}
            onPickImage={pickImage}
            onRecognize={recognizeSelectedImage}
            onOpenHistory={openRecognitionHistory}
          />
        ) : null}
        {activeTab === 'profile' ? (
          <ProfileScreen
            session={session}
            onSessionChange={(nextSession) => {
              setSession(nextSession);
              void cache.setSession(nextSession);
            }}
            onOpenEditProfile={() => setView({ name: 'editProfile' })}
            onOpenSettings={() => setView({ name: 'settings' })}
            onOpenAgreement={(kind) => setView({ name: 'agreement', kind })}
            onLogout={confirmLogout}
            isLoggingOut={isLoggingOut}
          />
        ) : null}
      </TabShell>
    );
  }

  return (
    <SafeAreaView style={[styles.app, !isLaunchFinished && styles.launchApp]}>
      <StatusBar style="dark" />
      {!isLaunchFinished ? (
        <LaunchScreen isReady={isBootstrapped} onFinish={() => setIsLaunchFinished(true)} />
      ) : (
        renderScreen()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: androidTopInset,
  },
  launchApp: {
    backgroundColor: '#ffffff',
  },
});
