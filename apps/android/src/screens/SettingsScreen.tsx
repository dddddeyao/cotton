import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { SettingsRow, StackPage } from '../components/common';
import { api } from '../services/api';
import { colors, spacing } from '../theme';
import { UserSession } from '../types';
import { getAndroidBottomInset } from '../utils/safeArea';


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
  const { height } = useWindowDimensions();
  const bottomInset = getAndroidBottomInset(height);
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
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.page, { paddingBottom: spacing.page + bottomInset }]} showsVerticalScrollIndicator={false}>

        <SettingsRow
          title={isChangingPassword ? '正在提交...' : '修改密码'}
          disabled={isChangingPassword}
          onPress={() => setShowPasswordForm((value) => !value)}
        />
        {showPasswordForm ? (
          <View style={styles.passwordPanel}>

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
              disabled={isChangingPassword}
              onPress={() => void changePassword()}
            />
          </View>
        ) : null}
        <SettingsRow title="清理缓存" onPress={onClearCache} />
        <SettingsRow
          title={isLoggingOut ? '正在退出...' : '退出登录'}
          danger
          disabled={isLoggingOut}
          onPress={session ? onLogout : () => Alert.alert('无需退出', '当前没有登录账号。')}
        />
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

  passwordPanel: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 12,
  },

  formInput: {
    minHeight: 48,
    borderRadius: spacing.radius,
    backgroundColor: '#f8fdff',
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
});
