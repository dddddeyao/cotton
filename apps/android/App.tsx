import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { cottonNews } from './src/data/newsData';
import { api } from './src/services/api';
import { cache } from './src/storage/cache';
import { colors } from './src/theme';
import { AppView, NewsItem, RecognitionResult, TabKey, UserSession } from './src/types';

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : '请检查网络后重试。';
}

// 新闻已写死在前端，列表分页由页面内部完成，不再需要向后端请求更多数据
function noop() {}

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
  const [news, setNews] = useState<NewsItem[]>(cottonNews);
  const [history, setHistory] = useState<RecognitionResult[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [selectedImageBase64, setSelectedImageBase64] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isLaunchFinished, setIsLaunchFinished] = useState(false);
  const [isNewsRefreshing, setIsNewsRefreshing] = useState(false);
  const [newsUpdatedAt, setNewsUpdatedAt] = useState<number | null>(null);

  // 新闻写死在前端：不做网络请求、不做爬虫，刷新只是重新载入同一份固定顺序的数据
  const refreshNews = useCallback(() => {
    setIsNewsRefreshing(true);
    setNews(cottonNews);
    setNewsUpdatedAt(Date.now());
    setIsNewsRefreshing(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const cachedSession = await cache.getSession();
        const cachedHistory = await cache.getHistory(cachedSession?.username);

        if (!isMounted) {
          return;
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
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveHistory = useCallback((items: RecognitionResult[], owner = session?.username ?? null) => {
    setHistory(items);
    void cache.setHistory(items, owner);
  }, [session?.username]);

  const handleSessionChange = useCallback((nextSession: UserSession) => {
    setSession(nextSession);
    void cache.setSession(nextSession);
    void cache.getHistory(nextSession.username).then(setHistory);
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
      setHistory([]);
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
      return (
        <RecognitionResultScreen
          result={view.result}
          onBack={() => {
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
            await cache.clearRuntimeData(session?.username);
            setHistory([]);
            Alert.alert('已清理', '本地临时检测记录与缓存已清理，登录状态已保留。');
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
            isLoadingMore={false}
            hasMore={false}
            onRefresh={refreshNews}
            onLoadMore={noop}
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
            onSessionChange={handleSessionChange}
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
