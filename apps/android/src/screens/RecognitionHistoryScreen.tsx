import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Modal, Platform, Pressable, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { EmptyState, StackPage } from '../components/common';
import { getRecognitionImageLayers } from '../services/recognitionImages';
import type { RecognitionImageLayer } from '../services/recognitionImages';
import { colors, shadow, spacing } from '../theme';
import { RecognitionMetric, RecognitionResult } from '../types';

type VisibleRecognitionImageLayer = RecognitionImageLayer & { uri: string };

const actionBarBaseHeight = 74;
const actionBarVerticalPadding = 12;
const androidBottomInsetFallback = 16;
const androidBottomInsetMax = 48;

function getAndroidBottomInset(windowHeight: number) {
  if (Platform.OS !== 'android') {
    return 0;
  }

  const screenHeight = Dimensions.get('screen').height;
  const statusBarHeight = NativeStatusBar.currentHeight ?? 0;
  const systemBarsHeight = Math.max(0, Math.round(screenHeight - windowHeight));
  const navigationBarHeight = Math.max(0, systemBarsHeight - statusBarHeight);

  return Math.min(Math.max(navigationBarHeight, androidBottomInsetFallback), androidBottomInsetMax);
}

function formatConfidence(value: number | null) {
  return value === null || value === undefined ? '未返回' : `${Math.round(value * 100)}%`;
}

function buildParameterCells(item: RecognitionResult): RecognitionMetric[] {
  return [
    { label: '检测等级', value: item.grade },
    { label: '模型置信度', value: formatConfidence(item.confidence) },
    { label: '采集时间', value: item.createdAt || '未返回' },
    ...(item.metrics || []).slice(0, 3),
  ];
}

function hasImageUri(image: RecognitionImageLayer): image is VisibleRecognitionImageLayer {
  return Boolean(image.uri);
}

export function RecognitionHistoryScreen({
  history,
  onBack,
  onOpenResult,
  onDelete,
}: {
  history: RecognitionResult[];
  onBack: () => void;
  onOpenResult: (result: RecognitionResult) => void;
  onDelete: (ids: string[]) => void | Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<VisibleRecognitionImageLayer | null>(null);
  const [previewHasError, setPreviewHasError] = useState(false);
  const allSelected = history.length > 0 && selectedIds.length === history.length;
  const { height } = useWindowDimensions();
  const bottomInset = getAndroidBottomInset(height);

  useEffect(() => {
    const availableIds = new Set(history.map((item) => item.id));
    setSelectedIds((current) => current.filter((id) => availableIds.has(id)));
  }, [history]);

  useEffect(() => {
    setPreviewHasError(false);
  }, [previewImage?.uri]);

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <StackPage title="检测记录" onBack={onBack}>
      <View style={styles.root}>
        <ScrollView style={styles.list} contentContainerStyle={[styles.page, { paddingBottom: 104 + bottomInset }]} showsVerticalScrollIndicator={false}>
          {history.map((item, index) => {
            const selected = selectedIds.includes(item.id);
            const parameterCells = buildParameterCells(item);
            const visibleImages = getRecognitionImageLayers(item).filter(hasImageUri);

            return (
              <View key={item.id} style={[styles.recordPanel, selected && styles.recordPanelSelected]}>
                <View style={styles.cardHeader}>
                  <Pressable style={[styles.checkBox, selected && styles.checkBoxActive]} onPress={() => toggle(item.id)}>
                    <Text style={styles.checkText}>{selected ? '✓' : ''}</Text>
                  </Pressable>
                  <View style={styles.recordTitleBlock}>
                    <Text style={styles.recordTitle}>检测记录 {String(index + 1)}</Text>
                  </View>
                  <Pressable style={styles.openButton} onPress={() => onOpenResult(item)} accessibilityRole="button">
                    <Text style={styles.openButtonText}>详情</Text>
                  </Pressable>
                </View>

                <View style={styles.recordBody}>
                  {visibleImages.length > 0 ? (
                    <View style={styles.historyImageGrid}>
                      {visibleImages.map((image) => (
                        <HistoryImageTile key={image.key} image={image} onPress={() => setPreviewImage(image)} />
                      ))}
                    </View>
                  ) : null}

                  <Pressable style={styles.parameterGrid} onPress={() => onOpenResult(item)} accessibilityRole="button">
                    {parameterCells.map((metric, metricIndex) => (
                      <View key={`${metric.label}-${metricIndex}`} style={styles.parameterCell}>
                        <Text style={styles.parameterLabel} numberOfLines={1}>
                          {metric.label}
                        </Text>
                        <Text style={styles.parameterValue} numberOfLines={2}>
                          {metric.value}
                        </Text>
                      </View>
                    ))}
                  </Pressable>
                </View>
              </View>
            );
          })}
          {history.length === 0 ? <EmptyState title="暂无检测记录" /> : null}
        </ScrollView>
        <Modal
          visible={Boolean(previewImage)}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={styles.previewBackdrop}>
            <Pressable style={styles.previewDismissLayer} onPress={() => setPreviewImage(null)} accessibilityRole="button" />
            <View style={styles.previewPanel}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {previewImage?.title}
                </Text>
                <Pressable style={styles.previewCloseButton} onPress={() => setPreviewImage(null)} accessibilityRole="button">
                  <Text style={styles.previewCloseText}>关闭</Text>
                </Pressable>
              </View>
              <View style={styles.previewBody}>
                {previewImage && !previewHasError ? (
                  <Image source={{ uri: previewImage.uri }} style={styles.previewImage} onError={() => setPreviewHasError(true)} />
                ) : (
                  <Text style={styles.previewErrorText}>图像加载失败</Text>
                )}
              </View>
            </View>
          </View>
        </Modal>
        <View style={[styles.actions, { minHeight: actionBarBaseHeight + bottomInset, paddingBottom: actionBarVerticalPadding + bottomInset }]}>
          <Pressable
            style={styles.selectAll}
            onPress={() => setSelectedIds(allSelected ? [] : history.map((item) => item.id))}
            accessibilityRole="button"
          >
            <View style={[styles.checkBox, allSelected && styles.checkBoxActive]}>
              <Text style={styles.checkText}>{allSelected ? '✓' : ''}</Text>
            </View>
            <Text style={styles.selectAllText}>全选</Text>
          </Pressable>
          <Pressable
            style={[styles.deleteButton, (selectedIds.length === 0 || isDeleting) && styles.deleteButtonDisabled]}
            disabled={selectedIds.length === 0 || isDeleting}
            onPress={async () => {
              setIsDeleting(true);
              try {
                await onDelete(selectedIds);
                setSelectedIds([]);
              } finally {
                setIsDeleting(false);
              }
            }}
            accessibilityRole="button"
          >
            <Text style={styles.deleteButtonText}>{isDeleting ? '删除中...' : '删除记录'}</Text>
          </Pressable>
        </View>
      </View>
    </StackPage>
  );
}

function HistoryImageTile({ image, onPress }: { image: VisibleRecognitionImageLayer; onPress: () => void }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [image.uri]);

  return (
    <Pressable style={styles.historyImageTile} onPress={onPress} accessibilityRole="button" accessibilityLabel={`放大查看${image.title}`}>
      <View style={styles.imageHeader}>
        <Text style={styles.imageHeaderText} numberOfLines={1}>{image.title}</Text>
      </View>
      <View style={styles.historyThumb}>
        {!hasError ? (
          <Image source={{ uri: image.uri }} style={styles.historyImage} onError={() => setHasError(true)} />
        ) : (
          <Text style={styles.historyThumbText}>图像加载失败</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  page: {
    padding: spacing.page,
  },
  recordPanel: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadow,
  },
  recordPanelSelected: {
    borderColor: colors.primaryDark,
  },
  cardHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2f7fb',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 12,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#8aa0ad',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
  },
  checkBoxActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  checkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  recordTitleBlock: {
    flex: 1,
  },
  recordTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  openButton: {
    minWidth: 58,
    minHeight: 32,
    borderRadius: spacing.radius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.line,
  },
  openButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  recordBody: {
    padding: 12,
  },
  historyImageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  historyImageTile: {
    width: '48%',
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    backgroundColor: '#f4fafc',
  },
  imageHeader: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2f7fb',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  imageHeaderText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  historyThumb: {
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  historyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  historyThumbText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 18, 28, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  previewDismissLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  previewPanel: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '82%',
    borderRadius: spacing.radius,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  previewHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 12,
  },
  previewTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginRight: 10,
  },
  previewCloseButton: {
    minWidth: 58,
    minHeight: 32,
    borderRadius: spacing.radius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4fafc',
    borderWidth: 1,
    borderColor: colors.line,
  },
  previewCloseText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  previewBody: {
    height: 420,
    maxHeight: '86%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  previewErrorText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '900',
  },
  parameterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  parameterCell: {
    width: '47.5%',
    minHeight: 52,
    borderRadius: spacing.radius,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 9,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  parameterLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  parameterValue: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  actions: {
    minHeight: actionBarBaseHeight,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: actionBarVerticalPadding,
    paddingBottom: actionBarVerticalPadding,
    paddingHorizontal: 18,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  deleteButton: {
    minWidth: 100,
    minHeight: 42,
    borderRadius: spacing.radius,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#9aa7b3',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
