import React from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, StackPage } from '../components/common';
import { spacing } from '../theme';

export function SimplePage({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  return (
    <StackPage title={title} onBack={onBack}>
      <View style={styles.page}>
        <EmptyState title={body} text="" />
      </View>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.page,
  },
});
