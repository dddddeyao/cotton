import React from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState, PrimaryButton, StackPage } from '../components/common';
import { colors, spacing } from '../theme';
import { UserSession } from '../types';

export function EditProfileScreen({
  session,
  onBack,
  onRequireLogin,
}: {
  session: UserSession | null;
  onBack: () => void;
  onRequireLogin: () => void;
}) {
  return (
    <StackPage title="编辑资料" onBack={onBack}>
      <View style={styles.page}>
        {session ? (
          <>
            <Text style={styles.fieldLabel}>账号</Text>
            <TextInput value={session.username} editable={false} style={styles.formInput} />
            <Text style={styles.fieldLabel}>姓名</Text>
            <TextInput placeholder="姓名" placeholderTextColor={colors.muted} style={styles.formInput} />
            <Text style={styles.fieldLabel}>单位</Text>
            <TextInput placeholder="单位" placeholderTextColor={colors.muted} style={styles.formInput} />
            <PrimaryButton title="保存" onPress={() => Alert.alert('已保存', '资料保存接口确认后会提交到后端。')} />
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
