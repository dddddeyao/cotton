import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState, PrimaryButton, StackPage } from '../components/common';
import { api } from '../services/api';
import { colors, spacing } from '../theme';
import { UserProfile, UserSession } from '../types';

type ProfileForm = Omit<UserProfile, 'username'>;

type ProfileState = {
  username?: string;
  data: ProfileForm;
};

const defaultProfile: ProfileForm = {
  nickname: '',
  phone: '',
  organization: '',
  role: '研究人员',
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
      <View style={styles.page}>
        {session ? (
          <>
            <Text style={styles.fieldLabel}>账号</Text>
            <TextInput value={session.username} editable={false} style={styles.formInput} />
            <Text style={styles.fieldLabel}>昵称</Text>
            <TextInput
              placeholder="昵称"
              placeholderTextColor={colors.muted}
              style={styles.formInput}
              value={visibleProfile.nickname}
              onChangeText={(value) => updateField('nickname', value)}
            />
            <Text style={styles.fieldLabel}>手机号</Text>
            <TextInput
              placeholder="手机号"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              style={styles.formInput}
              value={visibleProfile.phone}
              onChangeText={(value) => updateField('phone', value)}
            />
            <Text style={styles.fieldLabel}>单位</Text>
            <TextInput
              placeholder="单位"
              placeholderTextColor={colors.muted}
              style={styles.formInput}
              value={visibleProfile.organization}
              onChangeText={(value) => updateField('organization', value)}
            />
            <Text style={styles.fieldLabel}>身份</Text>
            <TextInput
              placeholder="身份"
              placeholderTextColor={colors.muted}
              style={styles.formInput}
              value={visibleProfile.role}
              onChangeText={(value) => updateField('role', value)}
            />
            <PrimaryButton
              title={isSaving ? '保存中...' : isLoading ? '同步中...' : '保存'}
              disabled={isSaving || isLoading}
              onPress={saveProfile}
            />
          </>
        ) : (
          <EmptyState title="请先登录" text="登录后可以编辑账号资料。" />
        )}
        {!session ? (
          <View style={styles.loginButtonWrap}>
            <PrimaryButton
              title="去登录"
              onPress={() => {
                onRequireLogin();
                onBack();
              }}
            />
          </View>
        ) : null}
      </View>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.page,
    gap: 10,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
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
    marginBottom: 8,
  },
  loginButtonWrap: {
    marginTop: 16,
  },
});
