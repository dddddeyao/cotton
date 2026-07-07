import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState, PrimaryButton, StackPage } from '../components/common';
import { api } from '../services/api';
import { colors, shadow, spacing } from '../theme';
import { UserProfile, UserSession } from '../types';

const androidBottomInset = Platform.OS === 'android' ? 34 : 0;

type ProfileForm = Omit<UserProfile, 'username'>;

type ProfileState = {
  username?: string;
  data: ProfileForm;
};

const defaultProfile: ProfileForm = {
  nickname: '',
  phone: '',
  organization: '',
  role: '',
};

export function EditProfileScreen({
  session,
  onBack,
  onRequireLogin,
}: {
  session: UserSession | null;
  onBack: () => void;
  onRequireLogin: () => void;
}) {
  const [profile, setProfile] = useState<ProfileState>({ data: defaultProfile });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!session) {
      setProfile({ data: defaultProfile });
      return;
    }

    let active = true;
    setIsLoading(true);
    api.fetchProfile(session)
      .then((remoteProfile) => {
        if (!active) return;
        setProfile({
          username: session.username,
          data: {
            nickname: remoteProfile.nickname,
            phone: remoteProfile.phone,
            organization: remoteProfile.organization,
            role: remoteProfile.role || defaultProfile.role,
          },
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  const updateField = (field: keyof ProfileForm, value: string) => {
    if (!session) return;

    setProfile((prev) => ({
      username: session.username,
      data: {
        ...(prev.username === session.username ? prev.data : defaultProfile),
        [field]: value,
      },
    }));
  };

  const saveProfile = async () => {
    if (!session) return;
    const visibleProfile = profile.username === session.username ? profile.data : defaultProfile;

    if (visibleProfile.phone && !/^1[3-9]\d{9}$/.test(visibleProfile.phone)) {
      Alert.alert('手机号格式不正确', '请检查后再保存。');
      return;
    }

    try {
      setIsSaving(true);
      const savedProfile = await api.updateProfile(session, visibleProfile);
      setProfile({
        username: session.username,
        data: {
          nickname: savedProfile.nickname,
          phone: savedProfile.phone,
          organization: savedProfile.organization,
          role: savedProfile.role || defaultProfile.role,
        },
      });
      Alert.alert('已保存', '资料已同步到当前账号。');
    } catch (error) {
      Alert.alert('保存失败', error instanceof Error ? error.message : '请稍后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const visibleProfile = session && profile.username === session.username ? profile.data : defaultProfile;

  return (
    <StackPage title="编辑资料" onBack={onBack}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {session ? (
          <View style={styles.formPanel}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>账号资料维护</Text>
              <Text style={styles.formMeta}>{isLoading ? '同步中' : '可编辑'}</Text>
            </View>
            <Field label="账号" value={session.username} editable={false} />
            <Field label="昵称" value={visibleProfile.nickname} onChangeText={(value) => updateField('nickname', value)} placeholder="昵称" />
            <Field label="手机号" value={visibleProfile.phone} onChangeText={(value) => updateField('phone', value)} placeholder="手机号" keyboardType="phone-pad" />
            <Field label="单位" value={visibleProfile.organization} onChangeText={(value) => updateField('organization', value)} placeholder="单位" />
            <Field label="身份" value={visibleProfile.role} onChangeText={(value) => updateField('role', value)} placeholder="身份" />
            <PrimaryButton
              title={isSaving ? '保存中...' : isLoading ? '同步中...' : '保存资料'}
              disabled={isSaving || isLoading}
              onPress={saveProfile}
            />
          </View>
        ) : (
          <>
            <EmptyState title="请先登录" text="登录后可以编辑账号资料。" />
            <View style={styles.loginButtonWrap}>
              <PrimaryButton
                title="去登录"
                onPress={() => {
                  onRequireLogin();
                  onBack();
                }}
              />
            </View>
          </>
        )}
      </ScrollView>
    </StackPage>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: 'default' | 'phone-pad';
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        style={[styles.formInput, !editable && styles.formInputReadonly]}
        onChangeText={onChangeText}
      />
    </View>
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
    paddingBottom: spacing.page + androidBottomInset,
    backgroundColor: colors.background,
  },
  formPanel: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    ...shadow,
  },
  formHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 12,
  },
  formTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  formMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  fieldRow: {
    marginBottom: 10,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 5,
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
  formInputReadonly: {
    backgroundColor: '#e7f4f8',
    color: colors.muted,
  },
  loginButtonWrap: {
    marginTop: 16,
  },
});
