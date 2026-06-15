import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, StackPage } from '../components/common';
import { colors, spacing } from '../theme';

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
            <Text style={styles.documentTitle}>{title}</Text>
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
    padding: spacing.page,
  },
  documentPanel: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
    padding: 18,
  },
  documentTitle: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 12,
  },
  documentBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 24,
  },
});
