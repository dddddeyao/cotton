import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, StackPage } from '../components/common';
import { colors, shadow, spacing } from '../theme';

const androidBottomInset = Platform.OS === 'android' ? 34 : 0;

export function SimplePage({
  title,
  body,
  onBack,
  variant = 'empty',
}: {
  title: string;
  body: string;
  onBack: () => void;
  variant?: 'empty' | 'document';
}) {
  return (
    <StackPage title={title} onBack={onBack}>
      {variant === 'document' ? (
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={styles.documentPanel}>
            <View style={styles.documentHeader}>
              <Text style={styles.documentTitle}>{title}</Text>
              <Text style={styles.documentCode}>DOC</Text>
            </View>
            <Text style={styles.documentBody}>{body}</Text>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.page}>
          <EmptyState title={body} text="" />
        </View>
      )}
    </StackPage>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    padding: spacing.page,
    paddingBottom: spacing.page + androidBottomInset,
    backgroundColor: colors.background,
  },
  documentPanel: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 16,
    ...shadow,
  },
  documentHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    marginBottom: 12,
  },
  documentTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  documentCode: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  documentBody: {
    color: '#253240',
    fontSize: 14,
    lineHeight: 22,
  },
});
