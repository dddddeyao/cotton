import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SecondaryButton, StackPage } from '../components/common';
import { getPrimaryRecognitionImageUri, getRecognitionImageLayers } from '../services/recognitionImages';
import type { RecognitionImageLayer } from '../services/recognitionImages';
import { colors, shadow, spacing } from '../theme';
import { RecognitionMetric, RecognitionResult } from '../types';

function shortValue(value: string, maxLength = 22) {
  if (!value) {
    return '未返回';
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}


export function RecognitionResultScreen({
  result,
  onBack,
  onRetry,
}: {
  result: RecognitionResult;
  onBack: () => void;
  onRetry: () => void;
}) {
  const metrics = result.metrics || [];
  const confidenceText =
    result.confidence === null || result.confidence === undefined
      ? '未返回'
      : `${Math.round(result.confidence * 10000) / 100}%`;
  const primaryImageUri = getPrimaryRecognitionImageUri(result);
  const [failedPrimaryImageUri, setFailedPrimaryImageUri] = React.useState<string | null>(null);
  const [previewImage, setPreviewImage] = React.useState<{ title: string; uri: string } | null>(null);
  const [primaryImageAspectRatio, setPrimaryImageAspectRatio] = React.useState(4 / 3);
  const primaryImageReady = Boolean(primaryImageUri) && failedPrimaryImageUri !== primaryImageUri;
  const imageLayers = getRecognitionImageLayers(result, { includeSource: false });

  return (
    <StackPage title="检测结果" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.reportHeader}>
          <View style={styles.reportTitleBlock}>
            <Text style={styles.reportTitle}>棉花图像质量检测报告</Text>

          </View>
          <View style={styles.confidenceBox}>
            <Text style={styles.confidenceLabel}>置信度</Text>
            <Text style={styles.confidenceText}>{confidenceText}</Text>
          </View>
        </View>


        <View style={styles.imagePanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>样本图像</Text>
            <Text style={styles.panelMeta} numberOfLines={1}>{result.createdAt || result.timestamp}</Text>
          </View>
          <View
            style={[
              styles.primaryImageViewport,
              primaryImageReady ? { aspectRatio: primaryImageAspectRatio } : styles.primaryImageViewportEmpty,
            ]}
          >
            {primaryImageReady ? (
              <Pressable
                style={styles.primaryImageTapArea}
                onPress={() => setPreviewImage({ title: '原始样本', uri: primaryImageUri })}
                accessibilityRole="imagebutton"
                accessibilityLabel="放大原始样本"
              >
                <Image
                  source={{ uri: primaryImageUri }}
                  style={styles.primaryImage}
                  onLoad={(event) => {
                    const { height, width } = event.nativeEvent.source;
                    if (width > 0 && height > 0) {
                      setPrimaryImageAspectRatio(width / height);
                    }
                  }}
                  onError={() => setFailedPrimaryImageUri(primaryImageUri)}
                />
              </Pressable>
            ) : (
              <View style={styles.primaryImageEmpty}>
                <Text style={styles.primaryImageEmptyTitle}>
                  {primaryImageUri ? '样本图像加载失败' : '未返回样本图像'}
                </Text>

              </View>
            )}
          </View>
          {imageLayers.length > 0 ? (
            <View style={styles.layerGrid}>
              {imageLayers.map((layer) => (
                <ImageLayer key={layer.key} layer={layer} onOpen={setPreviewImage} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.gradePanel}>
          <View style={styles.gradeHeader}>
            <View>
              <Text style={styles.gradeLabel}>判定结果</Text>
              <Text style={styles.gradeValue}>{result.grade}</Text>
            </View>

          </View>
          <Text style={styles.conclusion}>{result.conclusion || '未返回结论'}</Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>量化指标</Text>
        </View>
        <View style={styles.metricGrid}>
          {metrics.map((metric, index) => (
            <MetricCell key={`${metric.label}-${index}`} metric={metric} />
          ))}
        </View>

        <SecondaryButton title="重新选择图片" onPress={onRetry} />
      </ScrollView>
      <ImagePreviewModal preview={previewImage} onClose={() => setPreviewImage(null)} />
    </StackPage>
  );
}


function ImageLayer({
  layer,
  onOpen,
}: {
  layer: RecognitionImageLayer;
  onOpen: (preview: { title: string; uri: string }) => void;
}) {
  const [hasError, setHasError] = React.useState(false);
  const isReady = Boolean(layer.uri) && !hasError;

  if (!layer.uri) {
    return null;
  }

  return (
    <View style={styles.layerCell}>
      <View style={styles.layerHeader}>
        <Text style={styles.layerTitle} numberOfLines={1}>{layer.title}</Text>
        <Text style={[styles.layerStatus, isReady && styles.layerStatusReady]}>{isReady ? layer.badge : '加载失败'}</Text>
      </View>
      <View style={styles.layerImageBox}>
        {isReady ? (
          <Pressable
            style={styles.layerImageTapArea}
            onPress={() => onOpen({ title: layer.title, uri: layer.uri as string })}
            accessibilityRole="imagebutton"
            accessibilityLabel={`放大${layer.title}`}
          >
            <Image source={{ uri: layer.uri as string }} style={styles.layerImage} onError={() => setHasError(true)} />
          </Pressable>
        ) : (
          <Text style={styles.layerEmpty}>图层加载失败</Text>
        )}
      </View>
    </View>
  );
}

function ImagePreviewModal({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: { title: string; uri: string } | null;
}) {
  return (
    <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.previewBackdrop}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle} numberOfLines={1}>{preview?.title}</Text>
          <Pressable style={styles.previewCloseButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="关闭预览">
            <Text style={styles.previewCloseText}>关闭</Text>
          </Pressable>
        </View>
        {preview ? <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" /> : null}
      </View>
    </Modal>
  );
}
function MetricCell({ metric }: { metric: RecognitionMetric }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={styles.metricValue} numberOfLines={2}>{metric.value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.page,
    paddingBottom: 96,
    backgroundColor: colors.background,
  },
  reportHeader: {
    minHeight: 84,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  reportTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  reportTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },

  confidenceBox: {
    width: 92,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: '#9ddce7',
    backgroundColor: '#f8fdff',
    paddingHorizontal: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  confidenceLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
  },
  confidenceText: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 3,
  },

  imagePanel: {
    marginTop: 14,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadow,
  },
  panelHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#e2f7fb',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  panelTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  panelMeta: {
    maxWidth: 148,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  primaryImageViewport: {
    width: '100%',
    backgroundColor: '#ffffff',
  },
  primaryImageViewportEmpty: {
    minHeight: 232,
  },
  primaryImageTapArea: {
    width: '100%',
    height: '100%',
  },
  primaryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  primaryImageEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
  },
  primaryImageEmptyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },

  layerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 10,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: '#ffffff',
  },
  layerCell: {
    width: '48.5%',
    minWidth: 0,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  layerHeader: {
    minHeight: 36,
    paddingHorizontal: 7,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#d7e8ee',
  },
  layerTitle: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '900',
  },
  layerStatus: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 1,
  },
  layerStatusReady: {
    color: colors.success,
  },
  layerImageBox: {
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  layerImageTapArea: {
    width: '100%',
    height: '100%',
  },
  layerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  layerEmpty: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 24, 0.92)',
    paddingHorizontal: 14,
    paddingTop: 42,
    paddingBottom: 28,
  },
  previewHeader: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  previewCloseButton: {
    minWidth: 58,
    minHeight: 34,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  previewCloseText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  gradePanel: {
    marginTop: 14,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 14,
  },
  gradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  gradeLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  gradeValue: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    marginTop: 4,
  },

  conclusion: {
    color: '#253240',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#d7e8ee',
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },

  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCell: {
    width: '48%',
    minHeight: 94,
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    justifyContent: 'center',
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  metricValue: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    marginTop: 7,
  },
});
