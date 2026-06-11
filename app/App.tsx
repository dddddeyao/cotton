import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, SafeAreaView, StyleSheet } from 'react-native';

import { TabShell } from './src/components/TabShell';
import { mockNews, mockRecognitionHistory } from './src/data/mockData';
import { NewsScreen } from './src/screens/NewsScreen';
import { StandardsScreen } from './src/screens/StandardsScreen';
import { RecognitionScreen } from './src/screens/RecognitionScreen';
import { RecognitionResultScreen } from './src/screens/RecognitionResultScreen';
import { RecognitionHistoryScreen } from './src/screens/RecognitionHistoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { EditProfileScreen } from './src/screens/EditProfileScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SimplePage } from './src/screens/SimplePage';
import { api } from './src/services/api';
import { cache } from './src/storage/cache';
import { colors } from './src/theme';
import { AppView, NewsItem, RecognitionResult, TabKey, UserSession } from './src/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('news');
  const [view, setView] = useState<AppView>({ name: 'tabs' });
  const [news, setNews] = useState<NewsItem[]>(mockNews);
  const [history, setHistory] = useState<RecognitionResult[]>(mockRecognitionHistory);
  const [session, setSession] = useState<UserSession | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const [cachedNews, cachedHistory, cachedSession] = await Promise.all([
        cache.getNews(),
        cache.getHistory(),
        cache.getSession(),
      ]);

      if (!isMounted) {
        return;
      }

      if (cachedNews.length > 0) {
        setNews(cachedNews);
      }

      if (cachedHistory.length > 0) {
        setHistory(cachedHistory);
      }

      setSession(cachedSession);

      const refreshedNews = await api.fetchNews();
      if (isMounted) {
        setNews(refreshedNews);
        cache.setNews(refreshedNews);
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveHistory = useCallback((items: RecognitionResult[]) => {
    setHistory(items);
    cache.setHistory(items);
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
        if (remoteHistory.length > 0) {
          saveHistory(remoteHistory);
        }
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
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: false,
            quality: 0.9,
          });

    if (!result.canceled && result.assets[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
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
      const result = await api.recognizeImage(selectedImageUri, session?.token);
      const nextHistory = [result, ...history];
      saveHistory(nextHistory);
      setView({ name: 'recognitionResult', result });
    } catch (error) {
      Alert.alert('识别失败', error instanceof Error ? error.message : '请检查网络后重试。');
    } finally {
      setIsRecognizing(false);
    }
  }, [history, saveHistory, selectedImageUri, session?.token]);

  function renderScreen() {
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

    if (view.name === 'collection') {
      return <SimplePage title="我的收藏" onBack={openTabs} body="暂无收藏内容" />;
    }

    if (view.name === 'settings') {
      return (
        <SettingsScreen
          session={session}
          onBack={openTabs}
          onClearCache={async () => {
            await cache.clearRuntimeData();
            setNews(mockNews);
            setHistory([]);
            Alert.alert('已清理', '缓存新闻和本地临时识别记录已清理，登录状态已保留。');
          }}
          onLogout={confirmLogout}
          isLoggingOut={isLoggingOut}
        />
      );
    }

    if (view.name === 'agreement') {
      return (
        <SimplePage
          title={view.kind === 'user' ? '用户协议' : '隐私政策'}
          onBack={openTabs}
          body="第一版先展示占位内容。正式发布前需要补齐完整协议正文、数据使用范围、权限说明和联系方式。"
        />
      );
    }

    return (
      <TabShell activeTab={activeTab} onChangeTab={setActiveTab}>
        {activeTab === 'news' ? <NewsScreen news={news} /> : null}
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
              cache.setSession(nextSession);
            }}
            onOpenEditProfile={() => setView({ name: 'editProfile' })}
            onOpenCollection={() => setView({ name: 'collection' })}
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
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
