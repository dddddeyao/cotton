import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { PrimaryButton, SecondaryButton } from '../components/common';
import { setRuntimeApiBaseUrl } from '../config';
import { discoverServer, saveServerUrl } from '../services/serverConfig';
import { colors, spacing } from '../theme';
import { getAndroidBottomInset } from '../utils/safeArea';

// 首次启动（App 内还没有任何服务器地址时）进入本页：自动搜索局域网内的后端，
// 找到就保存并直接进入应用；没找到就按「8s → 15s → 30s → 60s」的间隔自动重试，
// 用户也可以点「重新搜索」立即重试，或用「手动填写地址」走 ServerSetupScreen。
const AUTO_RETRY_DELAYS_MS = [8000, 15000, 30000, 60000];

export function ServerBootstrapScreen({
  onConnected,
  onManualSetup,
}: {
  onConnected: (url: string) => void;
  onManualSetup: () => void;
}) {
  const [progress, setProgress] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [autoRetrySeconds, setAutoRetrySeconds] = useState(0);
  const { height } = useWindowDimensions();
  const bottomInset = getAndroidBottomInset(height);

  const cancelledRef = useRef(false);
  const attemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 用 ref 持有回调，避免父组件每次渲染传入新函数导致扫描重复启动
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  const clearTimers = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const runScan = useCallback(async () => {
    clearTimers();
    if (cancelledRef.current) {
      return;
    }

    setIsScanning(true);
    setAutoRetrySeconds(0);
    setProgress('正在搜索局域网内的服务器…');

    let found: string | null = null;
    try {
      found = await discoverServer((message) => {
        if (!cancelledRef.current) {
          setProgress(message);
        }
      });
    } catch {
      found = null;
    }

    if (cancelledRef.current) {
      return;
    }

    if (found) {
      await saveServerUrl(found);
      setRuntimeApiBaseUrl(found);
      onConnectedRef.current(found);
      return;
    }

    attemptRef.current += 1;
    setAttempt(attemptRef.current);
    setIsScanning(false);
    setProgress('');

    const delay = AUTO_RETRY_DELAYS_MS[Math.min(attemptRef.current - 1, AUTO_RETRY_DELAYS_MS.length - 1)];
    setAutoRetrySeconds(Math.round(delay / 1000));
    countdownTimerRef.current = setInterval(() => {
      setAutoRetrySeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    retryTimerRef.current = setTimeout(() => {
      void runScan();
    }, delay);
  }, [clearTimers]);

  useEffect(() => {
    cancelledRef.current = false;
    void runScan();

    return () => {
      cancelledRef.current = true;
      clearTimers();
    };
  }, [clearTimers, runScan]);

  return (
    <View style={[styles.screen, { paddingBottom: spacing.page + bottomInset }]}>
      <View style={styles.body}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="棉花识别助手图标"
        />

        {isScanning ? (
          <>
            <ActivityIndicator size="large" color={colors.primaryDark} />
            <Text style={styles.title}>正在连接服务器…</Text>
            <Text style={styles.text}>{progress || '正在搜索局域网内的服务器…'}</Text>
            {attempt > 0 ? <Text style={styles.hint}>第 {attempt + 1} 次搜索</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.title}>未找到服务器</Text>
            <Text style={styles.text}>请依次确认：</Text>
            <Text style={styles.bullet}>· 手机已连接与电脑相同的 WiFi</Text>
            <Text style={styles.bullet}>· 电脑上的后端服务已启动</Text>
            <Text style={styles.bullet}>· 路由器未开启客户端隔离</Text>
            {autoRetrySeconds > 0 ? (
              <Text style={styles.hint}>{autoRetrySeconds} 秒后自动重试</Text>
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton title="重新搜索" onPress={() => void runScan()} />
              <SecondaryButton title="手动填写地址" onPress={onManualSetup} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.page,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 104,
    height: 104,
    marginBottom: 24,
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  text: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  bullet: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  hint: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 24,
  },
});
