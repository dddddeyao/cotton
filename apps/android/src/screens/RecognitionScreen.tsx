import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/common';
import { ImagePreviewModal, PreviewImage } from '../components/ImagePreviewModal';
import { colors, shadow, spacing } from '../theme';


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

// 页面与卡片内边距：收紧留白，让内容更充分地铺开
const pagePadding = 12;
const panelPadding = 10;

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
  const [previewImage, setPreviewImage] = useState<PreviewImage>(null);

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>棉花识别</Text>

        <View style={styles.previewPanel}>
          <Text style={styles.panelTitle}>样本预览</Text>
          {/* 点击样本预览可放大查看 */}
          <Pressable
            style={styles.previewViewport}
            onPress={() => {
              if (imageUri) {
                setPreviewImage({ title: '样本预览', uri: imageUri });
              }
            }}
            disabled={!imageUri}
            accessibilityRole="imagebutton"
            accessibilityLabel="放大样本预览"
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.emptyPreview}>
                <View style={styles.emptyPreviewFrame}>
                  <Ionicons name="scan-outline" size={40} color={recognitionPalette.primary} />
                  <Text style={styles.emptyPreviewText}>{"\u8bf7\u4e0a\u4f20\u7167\u7247"}</Text>
                </View>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.controlPanel}>
          <View style={styles.controls}>
            <ActionButton icon="image-outline" title="导入图片" onPress={() => onPickImage('library')} />
            <ActionButton icon="camera-outline" title="拍摄样本" primary emphasis onPress={() => onPickImage('camera')} />
            <ActionButton icon="reader-outline" title="检测记录" onPress={onOpenHistory} />
          </View>
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            title={isRecognizing ? '检测中...' : '开始检测'}
            onPress={onRecognize}
            disabled={!imageUri || isRecognizing}
          />
        </View>
      </ScrollView>

      <ImagePreviewModal preview={previewImage} onClose={() => setPreviewImage(null)} />
    </>
  );
}

function ActionButton({
  icon,
  title,
  primary = false,
  emphasis = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  primary?: boolean;
  // emphasis：中间“拍摄样本”按钮加宽加大，两侧按钮保持等宽
  emphasis?: boolean;
  onPress: () => void | Promise<void>;
}) {
  return (
    <Pressable
      style={[styles.actionButton, emphasis && styles.actionButtonEmphasis, primary && styles.actionButtonPrimary]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={emphasis ? 28 : 22} color={primary ? '#ffffff' : recognitionPalette.primary} />
      <Text style={[styles.actionTitle, emphasis && styles.actionTitleEmphasis, primary && styles.actionTitlePrimary]}>
        {title}
      </Text>
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
    paddingHorizontal: pagePadding,
    paddingTop: 14,
    paddingBottom: 0,
  },
  screenTitle: {
    color: recognitionPalette.primaryText,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'left',
    marginBottom: 10,
  },
  previewPanel: {
    flex: 1,
    minHeight: 400,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recognitionPalette.line,
    backgroundColor: recognitionPalette.surface,
    padding: panelPadding,
    ...shadow,
  },
  panelTitle: {
    color: recognitionPalette.primaryText,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'left',
    marginBottom: 10,
  },
  previewViewport: {
    flex: 1,
    minHeight: 280,
    borderRadius: spacing.radius,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    backgroundColor: '#f8fcfd',
  },
  emptyPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  emptyPreviewFrame: {
    width: '100%',
    flex: 1,
    borderWidth: 1,
    borderColor: recognitionPalette.cyanLine,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
  },
  emptyPreviewText: {
    color: recognitionPalette.primaryText,
    fontSize: 15,
    fontWeight: '900',
  },
  controlPanel: {
    marginTop: 10,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recognitionPalette.line,
    backgroundColor: recognitionPalette.surface,
    padding: panelPadding,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 76,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recognitionPalette.line,
    backgroundColor: recognitionPalette.cyanSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  // 中间“拍摄样本”更宽更高，两侧按钮等宽并被拉伸到同高，保持对齐
  actionButtonEmphasis: {
    flex: 1.4,
    minHeight: 88,
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
  actionTitleEmphasis: {
    fontSize: 15,
  },
  actionTitlePrimary: {
    color: '#ffffff',
  },
  footer: {
    backgroundColor: recognitionPalette.surface,
    marginHorizontal: -pagePadding,
    marginTop: 10,
    paddingHorizontal: pagePadding,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: recognitionPalette.line,
  },
});
