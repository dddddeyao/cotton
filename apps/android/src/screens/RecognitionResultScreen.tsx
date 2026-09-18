import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ImagePreviewModal, PreviewImage } from '../components/ImagePreviewModal';
import { RecognitionReport } from '../components/RecognitionReport';
import { colors, recordTheme, spacing } from '../theme';
import { RecognitionResult } from '../types';
import { formatTimestamp } from '../utils/format';

export function RecognitionResultScreen({
  result,
  recordIndex = 1,
  onBack,
  onRetry,
}: {
  result: RecognitionResult;
  recordIndex?: number;
  onBack: () => void;
  onRetry: () => void;
}) {
  const [previewImage, setPreviewImage] = React.useState<PreviewImage>(null);
  const detectedAt = formatTimestamp(result.createdAt || result.timestamp);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>检测记录 {recordIndex}</Text>
          {detectedAt ? <Text style={styles.headerTime}>{detectedAt}</Text> : null}
        </View>
        <Pressable style={styles.headerBack} onPress={onBack} accessibilityRole="button" hitSlop={10}>
          <Text style={styles.headerBackText}>返回</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <RecognitionReport result={result} onOpenImage={setPreviewImage} />
        </View>

        <Pressable style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retryText}>重新选择图片</Text>
        </Pressable>
      </ScrollView>

      <ImagePreviewModal preview={previewImage} onClose={() => setPreviewImage(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: recordTheme.pageBackground,
  },
  // 顶部：标题 + 检测时间（两行），右侧保留“返回”，整体保持紧凑
  header: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: recordTheme.surface,
    borderBottomWidth: 1,
    borderBottomColor: recordTheme.border,
  },
  headerTextBlock: {
    flex: 1,
    marginRight: 10,
  },
  headerTitle: {
    color: recordTheme.textStrong,
    fontSize: 16,
    fontWeight: '700',
  },
  // 检测时间：较小的灰色文字
  headerTime: {
    color: recordTheme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  headerBack: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  headerBackText: {
    color: recordTheme.textLabel,
    fontSize: 14,
    fontWeight: '600',
  },
  page: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  // 主要内容区域：白色 + 极细浅灰边框 + 小圆角，无阴影、无渐变
  panel: {
    backgroundColor: recordTheme.surface,
    borderWidth: 1,
    borderColor: recordTheme.border,
    borderRadius: spacing.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  // 次级按钮：白底、深蓝文字、浅灰细边框、小圆角，不抢检测结果的视觉重点
  retryButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recordTheme.border,
    backgroundColor: recordTheme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
