import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { PrimaryButton, SecondaryButton, StackPage } from '../components/common';
import { getDefaultApiBaseUrl, setRuntimeApiBaseUrl } from '../config';
import {
  DEFAULT_SERVER_PORT,
  discoverServer,
  getStoredServerUrl,
  normalizeServerUrl,
  probeServer,
  saveServerUrl,
} from '../services/serverConfig';
import { colors, spacing } from '../theme';
import { getAndroidBottomInset } from '../utils/safeArea';

export function ServerSetupScreen({
  onBack,
  onSaved,
}: {
  onBack: () => void;
  onSaved: (url: string) => void;
}) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const { height } = useWindowDimensions();
  const bottomInset = getAndroidBottomInset(height);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const stored = await getStoredServerUrl();
      if (mounted) {
        setInput(stored || getDefaultApiBaseUrl());
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const applyServer = useCallback(
    async (rawUrl: string) => {
      const normalized = normalizeServerUrl(rawUrl);

      if (!normalized) {
        Alert.alert('请输入服务器地址', `例如：192.168.1.100:${DEFAULT_SERVER_PORT}`);
        return;
      }

      setIsBusy(true);
      setStatus('正在测试连接…');

      const reachable = await probeServer(normalized);
      setIsBusy(false);

      if (!reachable) {
        setStatus('');
        Alert.alert(
          '连接失败',
          `无法访问 ${normalized}/health\n\n请依次确认：\n1. 手机与电脑连接同一个 WiFi\n2. 电脑上的服务已启动\n3. 地址与端口填写正确`,
        );
        return;
      }

      await saveServerUrl(normalized);
      setRuntimeApiBaseUrl(normalized);
      setInput(normalized);
      setStatus(`已连接：${normalized}`);
      Alert.alert('设置成功', `服务器地址已保存：\n${normalized}`, [
        { text: '好的', onPress: () => onSaved(normalized) },
      ]);
    },
    [onSaved],
  );

  const handleAutoSearch = useCallback(async () => {
    setIsBusy(true);
    setStatus('正在搜索局域网内的服务器…');

    try {
      const found = await discoverServer((message) => setStatus(message));

      if (!found) {
        setStatus('');
        Alert.alert(
          '未找到服务器',
          '没有在局域网内找到后端服务。\n\n请确认电脑上的服务已启动；也可以手动填写电脑的 IP 地址。',
        );
        return;
      }

      await saveServerUrl(found);
      setRuntimeApiBaseUrl(found);
      setInput(found);
      setStatus(`已找到：${found}`);
      Alert.alert('已找到服务器', found, [{ text: '好的', onPress: () => onSaved(found) }]);
    } finally {
      setIsBusy(false);
    }
  }, [onSaved]);

  return (
    <StackPage title="服务器地址" onBack={onBack}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.page, { paddingBottom: spacing.page + bottomInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>填写后端服务器地址</Text>
          <Text style={styles.cardText}>
            换一台电脑部署后，只要在这里改一下地址就能继续使用，无需重新安装 App。
          </Text>
          <Text style={styles.cardText}>
            地址格式：电脑的局域网 IP + 端口，例如 <Text style={styles.mono}>192.168.1.100:{DEFAULT_SERVER_PORT}</Text>
            。不知道 IP 时，可以点下面的「自动搜索」。
          </Text>
        </View>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={`192.168.1.100:${DEFAULT_SERVER_PORT}`}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isBusy}
        />

        {status ? (
          <View style={styles.statusRow}>
            {isBusy ? <ActivityIndicator size="small" color={colors.primaryDark} /> : null}
            <Text style={styles.statusText}>{status}</Text>
          </View>
        ) : null}

        <PrimaryButton
          title={isBusy ? '处理中…' : '保存并测试连接'}
          disabled={isBusy}
          onPress={() => void applyServer(input)}
        />

        <SecondaryButton title={isBusy ? '搜索中…' : '自动搜索服务器'} onPress={() => void handleAutoSearch()} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>怎么查看电脑的 IP？</Text>
          <Text style={styles.cardText}>
            · Windows：在电脑上打开「命令提示符」，输入 <Text style={styles.mono}>ipconfig</Text>，看 IPv4 地址
          </Text>
          <Text style={styles.cardText}>
            · Linux / Ubuntu：输入 <Text style={styles.mono}>hostname -I</Text>
          </Text>
          <Text style={styles.cardText}>· 手机必须和电脑连接同一个 WiFi</Text>
        </View>
      </ScrollView>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    flexGrow: 1,
    padding: spacing.page,
    backgroundColor: colors.background,
  },
  card: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
  },
  cardText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 4,
  },
  mono: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  input: {
    minHeight: 50,
    borderRadius: spacing.radius,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    color: colors.primaryDark,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});
