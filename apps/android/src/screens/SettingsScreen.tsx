import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { SettingsRow, StackPage } from '../components/common';
import { spacing } from '../theme';
import { UserSession } from '../types';

export function SettingsScreen({
  session,
  onBack,
  onClearCache,
  onLogout,
  isLoggingOut,
}: {
  session: UserSession | null;
  onBack: () => void;
  onClearCache: () => void;
  onLogout: () => void | Promise<void>;
  isLoggingOut: boolean;
}) {
  return (
    <StackPage title="应用设置" onBack={onBack}>
      <View style={styles.page}>
        <SettingsRow title="修改密码" subtitle="接口确认后接入" onPress={() => Alert.alert('待接入', '修改密码接口确认后可启用。')} />
        <SettingsRow title="检查更新" subtitle="当前版本 1.0.0" onPress={() => Alert.alert('已是最新版本', '当前为开发版本 1.0.0。')} />
        <SettingsRow title="清理缓存" subtitle="清除新闻缓存和本地临时识别记录" onPress={onClearCache} />
        <SettingsRow
          title="退出登录"
          subtitle={isLoggingOut ? '正在退出...' : session ? `当前账号：${session.username}` : '当前未登录'}
          danger
          disabled={isLoggingOut}
          onPress={session ? onLogout : () => Alert.alert('无需退出', '当前没有登录账号。')}
        />
      </View>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.page,
  },
});
