import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, recordTheme, shadow, spacing } from '../theme';

export function StackPage({
  title,
  onBack,
  centerTitle = false,
  tone = 'brand',
  children,
}: {
  title: string;
  onBack: () => void;
  centerTitle?: boolean;
  // 'neutral' 使用识别记录页的中性灰配色，默认保持原有品牌配色
  tone?: 'brand' | 'neutral';
  children: React.ReactNode;
}) {
  const handleBack = React.useCallback(() => {
    onBack();
  }, [onBack]);
  const neutral = tone === 'neutral';

  return (
    <View style={styles.stackRoot}>
      <View style={[styles.stackHeader, neutral && styles.stackHeaderNeutral]}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            neutral && styles.backButtonNeutral,
            pressed && styles.backButtonPressed,
          ]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="返回"
          android_ripple={{ color: '#e7f4f8', borderless: false }}
          hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={neutral ? recordTheme.textStrong : colors.ink} />
        </Pressable>
        <View style={[styles.stackTitleBlock, centerTitle && styles.stackTitleBlockCentered]}>
          <Text style={[styles.stackTitle, neutral && styles.stackTitleNeutral, centerTitle && styles.stackTitleCentered]}>
            {title}
          </Text>
        </View>
        {centerTitle ? <View style={styles.stackHeaderSpacer} /> : null}
      </View>
      {children}
    </View>
  );
}

export function EmptyState({ title, text = '暂无可显示数据。' }: { title: string; text?: string }) {
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
      {rows.map((row, rowIndex) => (
        <View key={row.join('-')} style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]}>
          {row.map((cell, index) => (
            <Text key={`${cell}-${index}`} style={[styles.tableCell, index > 0 && styles.tableCellDivider]}>
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
  subtitle?: string;
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
      <View style={styles.settingsMarker} />
      <View style={styles.settingsTextBlock}>
        <Text style={[styles.settingsTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle ? <Text style={styles.settingsSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stackRoot: {
    flex: 1,
    backgroundColor: colors.background,
  },
  stackHeader: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  stackHeaderNeutral: {
    minHeight: 54,
    borderBottomColor: recordTheme.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  backButtonNeutral: {
    borderColor: recordTheme.border,
  },
  backButtonPressed: {
    opacity: 0.62,
  },
  stackTitleBlock: {
    flex: 1,
    marginLeft: 12,
  },
  stackTitleBlockCentered: {
    marginLeft: 0,
  },
  stackTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  stackTitleCentered: {
    textAlign: 'center',
  },
  stackTitleNeutral: {
    color: recordTheme.textStrong,
    fontWeight: '700',
  },
  stackHeaderSpacer: {
    width: 40,
    height: 40,
  },

  emptyPanel: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surfaceStrong,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 18,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: spacing.radius,
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9aa7b3',
    borderColor: '#9aa7b3',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '900',
  },
  table: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: colors.surfaceStrong,
    ...shadow,
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primaryDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tableHeaderCell: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 5,
    paddingVertical: 8,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#d7e8ee',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    backgroundColor: '#f8fdff',
  },
  tableCell: {
    flex: 1,
    color: '#253240',
    fontSize: 10.5,
    lineHeight: 15,
    paddingHorizontal: 5,
    paddingVertical: 6,
    textAlign: 'center',
  },
  tableCellDivider: {
    borderLeftWidth: 1,
    borderLeftColor: '#e3eef2',
  },
  settingsRow: {
    minHeight: 68,
    borderRadius: spacing.radius,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsRowDisabled: {
    opacity: 0.56,
  },
  settingsMarker: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    marginRight: 12,
  },
  settingsTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  settingsTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  settingsSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  dangerText: {
    color: colors.danger,
  },
});

