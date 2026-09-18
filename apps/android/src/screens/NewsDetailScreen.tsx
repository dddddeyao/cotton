import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StackPage } from '../components/common';
import { hasRealNewsImage } from '../services/newsImages';
import { colors, shadow, spacing } from '../theme';
import { NewsItem } from '../types';
import { formatDate } from '../utils/format';

export function NewsDetailScreen({ item, onBack }: { item: NewsItem; onBack: () => void }) {
  const body = item.content || item.summary;
  const [imageFailed, setImageFailed] = React.useState(false);
  const shouldShowImage = hasRealNewsImage(item.imageUrl) && !imageFailed;

  return (
    <StackPage title="资料详情" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.heroPanel}>
          {shouldShowImage ? (
            <Image source={{ uri: item.imageUrl }} style={styles.heroImage} onError={() => setImageFailed(true)} />
          ) : null}
          <View style={styles.heroBody}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.date}>{formatDate(item.date)}</Text>
            <Text style={styles.summary}>{item.summary || '摘要未返回'}</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <InfoCell label="来源" value={item.source || '未返回'} />
          <InfoCell label="关键词" value={item.keywords || '未返回'} />
        </View>

        <View style={styles.contentPanel}>
          <Text style={styles.sectionTitle}>详细内容</Text>
          <Text style={styles.content}>{body || '详细内容未返回'}</Text>
        </View>

        {item.sourceUrl ? (
          <Pressable style={styles.sourceButton} onPress={() => Linking.openURL(item.sourceUrl)} accessibilityRole="button">
            <Ionicons name="open-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.sourceButtonText}>查看原文来源</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </StackPage>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.page,
    paddingBottom: 96,
    backgroundColor: colors.background,
  },
  heroPanel: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadow,
  },
  heroImage: {
    width: '100%',
    height: 210,
    resizeMode: 'cover',
    backgroundColor: '#e7f4f8',
  },

  heroBody: {
    padding: 14,
  },
  date: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  title: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 28,
  },
  summary: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  infoCell: {
    flex: 1,
    minHeight: 66,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  infoValue: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    marginTop: 5,
  },
  contentPanel: {
    marginTop: 14,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  content: {
    color: '#253240',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
  sourceButton: {
    minHeight: 46,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    backgroundColor: '#ffffff',
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sourceButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
});

