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
import { colors, shadow, spacing } from '../theme';
import { UserSession } from '../types';

export function ProfileScreen({
  session,
  onSessionChange,
  onOpenEditProfile,
  onOpenSettings,
  onOpenAgreement,
  onLogout,
  isLoggingOut,
}: {
  session: UserSession | null;
  onSessionChange: (session: UserSession) => void;
  onOpenEditProfile: () => void;
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
        <View style={styles.systemHeader}>
          <View>
            <Text style={styles.systemTitle}>系统账号管理</Text>
            <Text style={styles.systemText}>用于检测记录同步、资料维护与系统设置</Text>
          </View>
          <View style={[styles.loginState, session && styles.loginStateActive]}>
            <Text style={[styles.loginStateText, session && styles.loginStateTextActive]}>{session ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
        </View>

        {session ? (
          <View style={styles.sessionPanel}>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>当前账号</Text>
              <Text style={styles.sessionValue}>{session.username}</Text>
            </View>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionLabel}>账号状态</Text>
              <Text style={styles.sessionValue}>已认证</Text>
            </View>
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
          <View style={styles.authPanel}>
            <View style={styles.authSwitch}>
              <Pressable style={[styles.authSwitchItem, mode === 'login' && styles.authSwitchItemActive]} onPress={() => switchMode('login')}>
                <Text style={[styles.authSwitchText, mode === 'login' && styles.authSwitchTextActive]}>登录</Text>
              </Pressable>
              <Pressable style={[styles.authSwitchItem, mode === 'register' && styles.authSwitchItemActive]} onPress={() => switchMode('register')}>
                <Text style={[styles.authSwitchText, mode === 'register' && styles.authSwitchTextActive]}>注册</Text>
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
              <PrimaryButton title={submitting ? '处理中...' : mode === 'login' ? '登录系统' : '注册账号'} onPress={submit} disabled={submitting} />
            </View>
          </View>
        )}

        <View style={styles.moduleHeader}>
          <Text style={styles.moduleHeaderText}>功能模块</Text>
          <Text style={styles.moduleHeaderMeta}>ACCOUNT</Text>
        </View>
        <View style={styles.profileCards}>
          <ProfileAction icon="document-text-outline" title="资料维护" subtitle="Person Information" onPress={onOpenEditProfile} />
          <ProfileAction icon="settings-outline" title="系统设置" subtitle="Settings" onPress={onOpenSettings} />
        </View>

        <View style={styles.appIntro}>
          <View style={styles.appIntroHeader}>
            <Ionicons name="leaf-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.appIntroTitle}>App 功能简介</Text>
          </View>
          <Text style={styles.appIntroText}>
            棉花识别助手整合图像识别、检测记录、行业资讯与账号资料维护，帮助快速完成样本分析、结果回看和信息管理。
          </Text>
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
        <Ionicons name={secure ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.primaryDark} />
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
      <Ionicons name={icon} size={22} color={colors.primaryDark} />
      <View style={styles.profileActionText}>
        <Text style={styles.profileActionTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.profileActionSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
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
    paddingBottom: 96,
  },
  systemHeader: {
    minHeight: 78,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  systemTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  systemText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  loginState: {
    minWidth: 76,
    minHeight: 34,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#f4fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginStateActive: {
    backgroundColor: '#e2f7fb',
    borderColor: '#9ddce7',
  },
  loginStateText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  loginStateTextActive: {
    color: colors.success,
  },
  authPanel: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    marginTop: 14,
  },
  authSwitch: {
    flexDirection: 'row',
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: 14,
  },
  authSwitchItem: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  authSwitchItemActive: {
    backgroundColor: colors.primaryDark,
  },
  authSwitchText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  authSwitchTextActive: {
    color: '#ffffff',
  },
  authForm: {
    gap: 10,
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
  },
  passwordRow: {
    minHeight: 48,
    borderRadius: spacing.radius,
    backgroundColor: '#f8fdff',
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  passwordToggle: {
    width: 48,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
  },
  passwordTogglePressed: {
    opacity: 0.56,
  },
  formMessage: {
    color: colors.primaryDark,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '800',
  },
  sessionPanel: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sessionRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#d7e8ee',
  },
  sessionLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  sessionValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  logoutInlineButton: {
    minHeight: 42,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: '#d6b3ae',
    backgroundColor: '#f8fdff',
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
    fontWeight: '900',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  moduleHeaderText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  moduleHeaderMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  profileCards: {
    flexDirection: 'row',
    gap: 8,
  },
  profileAction: {
    flex: 1,
    minHeight: 76,
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  profileActionText: {
    flex: 1,
    minWidth: 0,
  },
  profileActionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  profileActionSubtitle: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
    fontWeight: '700',
  },
  appIntro: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: '#cfe5ed',
    backgroundColor: '#f8fdff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
  },
  appIntroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  appIntroTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  appIntroText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '700',
  },
  profileLinks: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  profileLinkText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '900',
  },
  profileDivider: {
    color: colors.primaryDark,
  },
  customerService: {
    width: '100%',
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});
