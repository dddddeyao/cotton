import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, shadow, spacing } from '../theme';

export function StackPage({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const handleBack = React.useCallback(() => {
    onBack();
  }, [onBack]);

  return (
    <View style={styles.stackRoot}>
      <View style={styles.stackHeader}>
        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="返回"
          android_ripple={{ color: '#e7deef', borderless: true }}
          hitSlop={{ top: 16, right: 16, bottom: 16, left: 16 }}
        >
          <Ionicons name="chevron-back" size={30} color={colors.ink} />
        </Pressable>
        <Text style={styles.stackTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      {children}
    </View>
  );
}

export function EmptyState({ title, text = '后续接入真实数据后这里会自动刷新。' }: { title: string; text?: string }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  disabled,
  onPress,
}: {
  title: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress} accessibilityRole="button">
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableRowHeader}>
        {headers.map((header) => (
          <Text key={header} style={styles.tableHeaderCell}>
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row.join('-')} style={styles.tableRow}>
          {row.map((cell, index) => (
            <Text key={`${cell}-${index}`} style={styles.tableCell}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export function SettingsRow({
  title,
  subtitle,
  danger = false,
  disabled = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.settingsRow, disabled && styles.settingsRowDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
    >
      <View style={styles.settingsTextBlock}>
        <Text style={[styles.settingsTitle, danger && styles.dangerText]}>{title}</Text>
        <Text style={styles.settingsSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stackRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stackHeader: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 251, 255, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#eee4f6',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 4,
  },
  backButtonPressed: {
    opacity: 0.58,
  },
  stackTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 44,
  },
  emptyPanel: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surfaceStrong,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 24,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primaryButtonDisabled: {
    backgroundColor: '#aebfea',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  table: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: colors.surfaceStrong,
    ...shadow,
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
  },
  tableHeaderCell: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: '#fff',
  },
  tableCell: {
    flex: 1,
    color: '#4d4858',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 14,
    textAlign: 'center',
  },
  settingsRow: {
    minHeight: 76,
    borderRadius: spacing.radius,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsRowDisabled: {
    opacity: 0.56,
  },
  settingsTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  settingsTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  settingsSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  dangerText: {
    color: colors.danger,
  },
});
