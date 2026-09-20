import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { ServerSetupScreen } from './src/screens/ServerSetupScreen';
import { SimplePage } from './src/screens/SimplePage';
import { LaunchScreen } from './src/screens/LaunchScreen';
import { appConfig, getApiBaseUrl, getDefaultApiBaseUrl, setRuntimeApiBaseUrl } from './src/config';
import { getStoredServerUrl } from './src/services/serverConfig';
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
        // 服务器地址：优先使用用户在 App 内保存的，其次使用打包时的默认值
        const storedServerUrl = await getStoredServerUrl();
        const initialServerUrl = storedServerUrl || getDefaultApiBaseUrl();

        if (initialServerUrl) {
          setRuntimeApiBaseUrl(initialServerUrl);
        }

        const cachedSession = await cache.getSession();
        const cachedHistory = await cache.getHistory(cachedSession?.username);

        if (!isMounted) {
          return;
        }

        if (cachedHistory.length > 0) {
          setHistory(cachedHistory);
        }

        sessionUserRef.current = cachedSession?.username ?? null;
        setSession(cachedSession);

        // 启动时如果已登录，用服务器数据刷新该账号的检测记录（先显示本地缓存，服务器结果到达后覆盖）
        if (cachedSession?.token) {
          void syncRemoteHistory(cachedSession);
        }

        // 首次启动且没有任何可用地址时，直接引导用户去填写
        if (!initialServerUrl) {
          setView({ name: 'serverSetup' });
        }
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

  // 当前登录账号名：服务器历史是异步返回的，用它校验结果是否仍属于当前账号，避免切换账号时把 A 的记录写到 B 名下
  const sessionUserRef = useRef<string | null>(null);

  // 从服务器拉取「当前账号」的检测记录。
  // 登录、注册、启动时都会调用：重新登录或换设备后仍能看到该账号过去的检测记录；
  // 服务器不可用或未配置历史接口时静默失败，继续展示手机本地缓存的记录。
  const syncRemoteHistory = useCallback(async (target: UserSession) => {
    if (!target?.token) {
      return;
    }

    try {
      const remoteHistory = await api.fetchHistory(target.token);

      if (sessionUserRef.current !== target.username) {
        return;
      }

      setHistory(remoteHistory);
      void cache.setHistory(remoteHistory, target.username);
    } catch {
      // 静默失败：保留本地记录，不打断用户操作
    }
  }, []);

  const saveHistory = useCallback((items: RecognitionResult[], owner = session?.username ?? null) => {
    setHistory(items);
    void cache.setHistory(items, owner);
  }, [session?.username]);

  const handleSessionChange = useCallback((nextSession: UserSession) => {
    setSession(nextSession);
    void cache.setSession(nextSession);
    // 切换账号：先清空上一位账号的记录视图，再载入目标账号的数据，保证不同账号互不可见
    sessionUserRef.current = nextSession.username;
    setHistory([]);
    void cache.getHistory(nextSession.username).then((localHistory) => {
      if (sessionUserRef.current !== nextSession.username) {
        return;
      }

      // 本地缓存只作为先用先显示的兜底；服务器结果到达后会整体覆盖，所以这里仅在列表仍为空时填充
      setHistory((current) => (current.length > 0 ? current : localHistory));
    });
    // 登录 / 注册成功后立刻同步该账号过去的检测记录
    void syncRemoteHistory(nextSession);
  }, [syncRemoteHistory]);

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
      sessionUserRef.current = null;
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
          `接口：${getApiBaseUrl()}${appConfig.endpoints.recognition}`,
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


    if (view.name === 'serverSetup') {
      return (
        <ServerSetupScreen
          onBack={() => setView({ name: 'settings' })}
          onSaved={() => setView({ name: 'settings' })}
        />
      );
    }

    if (view.name === 'settings') {
      return (
        <SettingsScreen
          session={session}
          onBack={openTabs}
          onOpenServerSetup={() => setView({ name: 'serverSetup' })}
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
          ? `欢迎使用「棉花识别助手」。本协议说明您在使用本应用时的权利与义务，请在开始使用前仔细阅读。

一、服务内容
1. 本应用为棉花样本检测辅助工具，提供图像采集、颜色级与杂质等级识别、检测记录管理、行业资讯浏览等功能。
2. 识别结果由算法模型给出，仅作为辅助参考，不能替代人工检验、实验室检测或主管部门的最终判定结论。

二、账号与安全
1. 请使用管理员分配的账号登录，或按提示自行注册账号。
2. 请妥善保管账号与密码，因账号信息泄露造成的损失由使用方自行承担。
3. 发现账号异常时，请立即联系管理员或拨打客服电话。

三、使用规范
1. 请勿上传与本业务无关的图片，或含有违法违规内容的图片。
2. 请勿对本应用进行反向工程、破解，或用于未授权用途。
3. 请勿以任何方式干扰服务器与网络的正常运行。

四、知识产权
本应用及其相关文档、界面设计与模型算法的权利归开发方所有。

五、服务变更与免责
服务内容可能因部署环境、网络状况或业务调整发生变更。因不可抗力、网络中断、设备故障导致的服务中断，开发方不承担由此产生的间接损失。

六、其他
继续使用本应用，即表示您已阅读并同意本协议。`
          : `我们重视您的个人信息保护。本政策说明本应用会处理哪些信息、如何使用以及如何保护。

一、收集的信息
1. 账号信息：登录或注册时填写的用户名与密码，用于身份校验。
2. 检测图片：您通过拍照或相册选择的棉花样本图片，用于上传至识别服务并生成检测结果。
3. 检测记录：识别时间与识别结果等，用于在「检测记录」中回看与删除。

二、信息的使用
1. 检测图片仅用于本次识别处理与结果展示，不用于其他用途。
2. 检测记录保存在部署本应用的本地服务器（局域网内），不会上传至互联网。
3. 行业资讯内容随应用一并提供，浏览资讯不会上传任何个人信息。

三、信息的存储
1. 登录状态与临时检测记录会缓存在手机本地，您可在「应用设置 → 清理缓存」中清除。
2. 服务器端数据保存在部署单位的服务器中，由部署单位负责管理。

四、信息共享
除法律法规要求或主管部门依法查询外，我们不会向任何第三方提供您的信息。

五、权限说明
应用会申请相机与相册（读取图片）权限，仅用于拍摄或选择待检测的棉花样本图片。

六、联系我们
如对本政策有疑问，可通过应用内公示的客服电话与我们联系。`;

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
