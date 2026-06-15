import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '../components/common';
import { api } from '../services/api';
import { colors, spacing } from '../theme';
import { UserSession } from '../types';

export function ProfileScreen({
  session,
  onSessionChange,
  onOpenEditProfile,
  onOpenCollection,
  onOpenSettings,
  onOpenAgreement,
  onLogout,
  isLoggingOut,
}: {
  session: UserSession | null;
  onSessionChange: (session: UserSession) => void;
  onOpenEditProfile: () => void;
  onOpenCollection: () => void;
  onOpenSettings: () => void;
  onOpenAgreement: (kind: 'user' | 'privacy') => void;
  onLogout: () => void | Promise<void>;
  isLoggingOut: boolean;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function switchMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setMessage('');
    setConfirmPassword('');
  }

  async function submit() {
    setMessage('');
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setMessage('请输入账号和密码');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setMessage('两次输入的密码不一致');
      return;
    }

    try {
      setSubmitting(true);
      const nextSession = mode === 'login' ? await api.login(normalizedUsername, password) : await api.register(normalizedUsername, password);
      onSessionChange(nextSession);
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setMessage(mode === 'login' ? '登录成功' : '注册成功，已自动登录');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {session ? (
          <View style={styles.sessionBanner}>
            <View style={styles.sessionIcon}>
              <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
            </View>
            <Text style={styles.sessionTitle}>已登录：{session.username}</Text>
            <Text style={styles.sessionText}>识别历史、资料编辑等账号功能会优先使用当前 token。</Text>
            <Pressable
              style={[styles.logoutInlineButton, isLoggingOut && styles.logoutInlineButtonDisabled]}
              onPress={onLogout}
              disabled={isLoggingOut}
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={styles.logoutInlineText}>{isLoggingOut ? '正在退出...' : '退出登录'}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.authSwitch}>
              <Pressable style={[styles.authSwitchItem, mode === 'login' && styles.authSwitchItemActive]} onPress={() => switchMode('login')}>
                <Text style={[styles.authSwitchText, mode === 'login' && styles.authSwitchTextActive]}>登录</Text>
              </Pressable>
              <Pressable style={[styles.authSwitchItem, mode === 'register' && styles.authSwitchItemActiveMuted]} onPress={() => switchMode('register')}>
                <Text style={styles.authSwitchText}>注册</Text>
              </Pressable>
            </View>

            <View style={styles.authForm}>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder={mode === 'login' ? '账号' : '用户名'}
                placeholderTextColor={colors.muted}
                style={styles.formInput}
                autoCapitalize="none"
              />
              <PasswordField
                value={password}
                onChangeText={setPassword}
                placeholder="密码"
                secure={secure}
                onToggleSecure={() => setSecure((current) => !current)}
              />
              {mode === 'register' ? (
                <PasswordField
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="再次输入密码"
                  secure={secure}
                  onToggleSecure={() => setSecure((current) => !current)}
                />
              ) : null}
              {message ? <Text style={styles.formMessage}>{message}</Text> : null}
              <PrimaryButton title={submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'} onPress={submit} disabled={submitting} />
            </View>
          </>
        )}

        <View style={styles.profileCards}>
          <ProfileAction icon="document-text" title="编辑资料" subtitle="Person Information" onPress={onOpenEditProfile} />
          <ProfileAction icon="bookmark" title="我的收藏" subtitle="Collection" onPress={onOpenCollection} />
          <ProfileAction icon="settings" title="应用设置" subtitle="Settings" onPress={onOpenSettings} />
        </View>

        <View style={styles.profileLinks}>
          <Pressable onPress={() => onOpenAgreement('user')}>
            <Text style={styles.profileLinkText}>用户协议</Text>
          </Pressable>
          <Text style={styles.profileDivider}>|</Text>
          <Pressable onPress={() => onOpenAgreement('privacy')}>
            <Text style={styles.profileLinkText}>隐私政策</Text>
          </Pressable>
          <Text style={styles.customerService}>客服电话：18967096861</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({
  value,
  onChangeText,
  placeholder,
  secure,
  onToggleSecure,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure: boolean;
  onToggleSecure: () => void;
}) {
  return (
    <View style={styles.passwordRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.passwordInput}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable
        style={({ pressed }) => [styles.passwordToggle, pressed && styles.passwordTogglePressed]}
        onPress={onToggleSecure}
        accessibilityRole="button"
        accessibilityLabel={secure ? '显示密码' : '隐藏密码'}
        hitSlop={8}
      >
        <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

function ProfileAction({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.profileAction} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={38} color="#20202a" />
      <Text style={styles.profileActionTitle}>{title}</Text>
      <Text style={styles.profileActionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    padding: spacing.page,
    paddingTop: 70,
    paddingBottom: 96,
  },
  authSwitch: {
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: '#edf5ff',
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 28,
  },
  authSwitchItem: {
    minWidth: 126,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  authSwitchItemActive: {
    backgroundColor: colors.primaryDark,
  },
  authSwitchItemActiveMuted: {
    backgroundColor: '#cfe5ff',
  },
  authSwitchText: {
    color: '#2e3342',
    fontSize: 20,
    fontWeight: '800',
  },
  authSwitchTextActive: {
    color: '#ffffff',
  },
  authForm: {
    gap: 12,
    marginBottom: 22,
  },
  formInput: {
    minHeight: 52,
    borderRadius: spacing.radius,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 16,
  },
  passwordRow: {
    minHeight: 52,
    borderRadius: spacing.radius,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    color: colors.ink,
    fontSize: 16,
  },
  passwordToggle: {
    width: 52,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordTogglePressed: {
    opacity: 0.56,
  },
  formMessage: {
    color: colors.primaryDark,
    fontSize: 14,
    textAlign: 'center',
  },
  sessionBanner: {
    borderRadius: spacing.radius,
    backgroundColor: '#edf6ff',
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#d5e7ff',
    alignItems: 'center',
  },
  sessionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sessionTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900',
  },
  sessionText: {
    color: '#52617d',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    textAlign: 'center',
  },
  logoutInlineButton: {
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f2c6bd',
    backgroundColor: '#fff6f3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  logoutInlineButtonDisabled: {
    opacity: 0.56,
  },
  logoutInlineText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  profileCards: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  profileAction: {
    flex: 1,
    minHeight: 136,
    borderRadius: spacing.radius,
    backgroundColor: 'rgba(255, 251, 255, 0.74)',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  profileActionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  profileActionSubtitle: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  profileLinks: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 32,
  },
  profileLinkText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '700',
  },
  profileDivider: {
    color: colors.primaryDark,
  },
  customerService: {
    width: '100%',
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 14,
  },
});
