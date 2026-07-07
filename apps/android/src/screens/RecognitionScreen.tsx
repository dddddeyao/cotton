import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PrimaryButton } from '../components/common';
import { colors, shadow, spacing } from '../theme';

const emptyPreviewImage = require('../../assets/recognition-empty-bg.png');

const recognitionPalette = {
  background: colors.background,
  surface: colors.surface,
  surfaceSoft: colors.surfaceStrong,
  primary: colors.primaryDark,
  primaryText: colors.ink,
  muted: colors.muted,
  line: colors.line,
  cyan: colors.primarySoft,
  cyanSoft: colors.accentSoft,
  cyanLine: '#a8dce5',
  instrumentInk: '#111827',
};

export function RecognitionScreen({
  imageUri,
  isRecognizing,
  onPickImage,
  onRecognize,
  onOpenHistory,
}: {
  imageUri: string;
  isRecognizing: boolean;
  onPickImage: (source: 'camera' | 'library') => void;
  onRecognize: () => void;
  onOpenHistory: () => void | Promise<void>;
}) {
  const acquisitionState = isRecognizing ? '检测中' : imageUri ? '已载入' : '待上传';
  const inputState = imageUri ? '本地图像' : '无输入';
  const pipelineState = isRecognizing ? '处理中' : imageUri ? '待开始' : '未开始';
  const { height } = useWindowDimensions();
  const previewViewportHeight = Math.max(184, Math.min(282, Math.round(height * 0.31)));
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerPanel}>
        <View>
          <View style={styles.headerTitleRow}>
            <View style={[styles.signalDot, imageUri && styles.signalDotReady, isRecognizing && styles.signalDotActive]} />
            <Text style={styles.headerTitle}>棉花样本分析</Text>
          </View>
          <Text style={styles.headerText}>棉花样本视觉采集与识别提交</Text>
        </View>
        <View style={[styles.statusCell, imageUri && styles.statusCellReady]}>
          <Text style={styles.statusLabel}>任务状态</Text>
          <Text style={[styles.statusText, imageUri && styles.statusTextReady]}>{acquisitionState}</Text>
        </View>
      </View>

      <View style={styles.previewPanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>样本预览舱</Text>
            <Text style={styles.panelSubTitle}>VISUAL ACQUISITION</Text>
          </View>
          <View style={styles.panelMetaGroup}>
            <View style={[styles.metaDot, imageUri && styles.metaDotReady, isRecognizing && styles.metaDotActive]} />
            <Text style={styles.panelMeta}>{imageUri ? '已载入' : '未载入'}</Text>
          </View>
        </View>
        <View style={[styles.previewViewport, { height: previewViewportHeight }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <ImageBackground
              source={emptyPreviewImage}
              style={styles.emptyPreview}
              imageStyle={styles.emptyPreviewImage}
              resizeMode="cover"
            >
              <View style={styles.emptyPreviewScrim}>
                <Text style={styles.emptyPreviewText}>请上传照片</Text>
              </View>
            </ImageBackground>
          )}
        </View>
        <View style={styles.previewInfoRow}>
          <InfoCell label="对象" value="棉花样本" />
          <InfoCell label="输入" value={inputState} />
          <InfoCell label="流程" value={pipelineState} />
        </View>
      </View>

      <View style={styles.controlPanel}>
        <View style={styles.controlHeader}>
          <Text style={styles.controlTitle}>任务操作</Text>
          <Text style={styles.controlMeta}>INPUT / RUN / ARCHIVE</Text>
        </View>
        <View style={styles.controls}>
          <ActionButton icon="image-outline" title="导入图片" subtitle="相册模式" onPress={() => onPickImage('library')} />
          <ActionButton icon="camera-outline" title="拍摄样本" subtitle="相机模式" primary onPress={() => onPickImage('camera')} />
          <ActionButton icon="reader-outline" title="检测记录" subtitle="参数记录" onPress={onOpenHistory} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>{imageUri ? '样本图像已准备，可提交检测。' : '请导入或拍摄棉花样本图像。'}</Text>
        <PrimaryButton
          title={isRecognizing ? '检测中...' : '开始检测'}
          onPress={onRecognize}
          disabled={!imageUri || isRecognizing}
        />
      </View>
    </ScrollView>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  title,
  subtitle,
  primary = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  primary?: boolean;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable style={[styles.actionButton, primary && styles.actionButtonPrimary]} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={24} color={primary ? '#ffffff' : recognitionPalette.primary} />
      <Text style={[styles.actionTitle, primary && styles.actionTitlePrimary]}>{title}</Text>
      <Text style={[styles.actionSubtitle, primary && styles.actionSubtitlePrimary]}>{subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: recognitionPalette.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.page,
    paddingBottom: 0,
  },
  headerPanel: {
    minHeight: 78,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recognitionPalette.line,
    backgroundColor: recognitionPalette.surface,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signalDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#9aa8b3',
  },
  signalDotReady: {
    backgroundColor: recognitionPalette.primary,
  },
  signalDotActive: {
    backgroundColor: '#111827',
  },
  headerTitle: {
    color: recognitionPalette.primaryText,
    fontSize: 19,
    fontWeight: '900',
  },
  headerText: {
    color: recognitionPalette.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  statusCell: {
    minWidth: 82,
    minHeight: 42,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recognitionPalette.line,
    backgroundColor: recognitionPalette.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusCellReady: {
    backgroundColor: recognitionPalette.cyan,
    borderColor: recognitionPalette.cyanLine,
  },
  statusLabel: {
    color: recognitionPalette.muted,
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 2,
  },
  statusText: {
    color: recognitionPalette.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  statusTextReady: {
    color: recognitionPalette.primary,
  },
  previewPanel: {
    marginTop: 14,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recognitionPalette.line,
    backgroundColor: recognitionPalette.surface,
    overflow: 'hidden',
    ...shadow,
  },
  panelHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: recognitionPalette.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: recognitionPalette.line,
  },
  panelTitle: {
    color: recognitionPalette.primaryText,
    fontSize: 15,
    fontWeight: '900',
  },
  panelSubTitle: {
    color: recognitionPalette.muted,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
  },
  panelMetaGroup: {
    minHeight: 30,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recognitionPalette.line,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  metaDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#9aa8b3',
  },
  metaDotReady: {
    backgroundColor: recognitionPalette.primary,
  },
  metaDotActive: {
    backgroundColor: recognitionPalette.instrumentInk,
  },
  panelMeta: {
    color: recognitionPalette.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  previewViewport: {
    minHeight: 184,
    backgroundColor: '#dfeef3',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreviewImage: {
    opacity: 0.16,
  },
  emptyPreviewScrim: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 251, 253, 0.76)',
  },
  emptyPreviewText: {
    color: recognitionPalette.primaryText,
    fontSize: 22,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.82)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  previewInfoRow: {
    minHeight: 62,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: recognitionPalette.line,
    backgroundColor: recognitionPalette.surfaceSoft,
  },
  infoCell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: recognitionPalette.line,
  },
  infoLabel: {
    color: recognitionPalette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  infoValue: {
    color: recognitionPalette.primaryText,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 4,
  },
  controlPanel: {
    marginTop: 14,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recognitionPalette.line,
    backgroundColor: recognitionPalette.surface,
    padding: 12,
  },
  controlHeader: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  controlTitle: {
    color: recognitionPalette.primaryText,
    fontSize: 15,
    fontWeight: '900',
  },
  controlMeta: {
    color: recognitionPalette.muted,
    fontSize: 9,
    fontWeight: '900',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 84,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recognitionPalette.line,
    backgroundColor: recognitionPalette.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionButtonPrimary: {
    backgroundColor: recognitionPalette.primary,
    borderColor: recognitionPalette.primary,
  },
  actionTitle: {
    color: recognitionPalette.primaryText,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 6,
  },
  actionTitlePrimary: {
    color: '#ffffff',
  },
  actionSubtitle: {
    color: recognitionPalette.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  actionSubtitlePrimary: {
    color: colors.primarySoft,
  },
  footer: {
    backgroundColor: recognitionPalette.surface,
    marginHorizontal: -spacing.page,
    marginTop: 14,
    padding: spacing.page,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: recognitionPalette.line,
  },
  hint: {
    color: recognitionPalette.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});