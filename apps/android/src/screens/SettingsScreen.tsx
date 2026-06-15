import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { SettingsRow, StackPage } from '../components/common';
import { api } from '../services/api';
import { colors, spacing } from '../theme';
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const changePassword = async () => {
    if (!session) {
      Alert.alert('请先登录', '登录后可以修改密码。');
      return;
    }

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('请填写完整密码信息');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('新密码至少 6 位');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('两次新密码不一致');
      return;
    }

    try {
      setIsChangingPassword(true);
      await api.changePassword(passwordForm.oldPassword, passwordForm.newPassword, session.token);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      Alert.alert('已修改', '密码修改成功。');
    } catch (error) {
      Alert.alert('修改失败', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <StackPage title="应用设置" onBack={onBack}>
      <View style={styles.page}>
        <SettingsRow
          title="修改密码"
          subtitle={isChangingPassword ? '正在提交...' : session ? '账号安全校验' : '登录后可用'}
          disabled={isChangingPassword}
          onPress={() => setShowPasswordForm((value) => !value)}
        />
        {showPasswordForm ? (
          <View style={styles.passwordPanel}>
            <Text style={styles.panelTitle}>修改密码</Text>
            <TextInput
              placeholder="当前密码"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.formInput}
              value={passwordForm.oldPassword}
              onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, oldPassword: value }))}
            />
            <TextInput
              placeholder="新密码"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.formInput}
              value={passwordForm.newPassword}
              onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
            />
            <TextInput
              placeholder="确认新密码"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.formInput}
              value={passwordForm.confirmPassword}
              onChangeText={(value) => setPasswordForm((prev) => ({ ...prev, confirmPassword: value }))}
            />
            <SettingsRow
              title={isChangingPassword ? '提交中...' : '提交修改'}
              subtitle="修改成功后下次登录使用新密码"
              disabled={isChangingPassword}
              onPress={() => void changePassword()}
            />
          </View>
        ) : null}
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
  passwordPanel: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
    padding: 14,
    marginBottom: 12,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  formInput: {
    minHeight: 50,
    borderRadius: spacing.radius,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 16,
    marginBottom: 10,
  },
});
