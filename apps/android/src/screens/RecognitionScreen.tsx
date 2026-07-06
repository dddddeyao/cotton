import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/common';
import { CottonFieldVisual } from '../components/visuals';
import { colors, shadow, spacing } from '../theme';

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
  return (
    <View style={styles.root}>
      <View style={styles.previewPanel}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.panelKicker}>IMAGE ACQUISITION</Text>
            <Text style={styles.panelTitle}>棉花样本采集台</Text>
          </View>
          <View style={[styles.statusBadge, imageUri && styles.statusBadgeReady]}>
            <Text style={[styles.statusText, imageUri && styles.statusTextReady]}>{imageUri ? '样本已载入' : '等待采集'}</Text>
          </View>
        </View>

        <View style={styles.previewViewport}>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : <CottonFieldVisual />}
          <View pointerEvents="none" style={styles.frameTopLeft} />
          <View pointerEvents="none" style={styles.frameTopRight} />
          <View pointerEvents="none" style={styles.frameBottomLeft} />
          <View pointerEvents="none" style={styles.frameBottomRight} />
        </View>

        <View style={styles.previewFooter}>
          <Text style={styles.previewMeta}>采集对象：棉花图像样本</Text>
          <Text style={styles.previewMeta}>{imageUri ? '图像可进入识别流程' : '建议在均匀光照下完成拍摄'}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.toolCard} onPress={() => onPickImage('library')} accessibilityRole="button">
          <View style={styles.toolIconBox}>
            <Ionicons name="image-outline" size={26} color={colors.primaryDark} />
          </View>
          <Text style={styles.toolLabel}>相册模式</Text>
          <Text style={styles.toolText}>导入既有样本</Text>
        </Pressable>

        <Pressable style={styles.captureButton} onPress={() => onPickImage('camera')} accessibilityRole="button">
          <View style={styles.captureIconBox}>
            <Ionicons name="camera" size={34} color="#ffffff" />
          </View>
          <Text style={styles.captureLabel}>相机模式</Text>
          <Text style={styles.captureText}>现场拍摄采集</Text>
        </Pressable>

        <Pressable style={styles.toolCard} onPress={onOpenHistory} accessibilityRole="button">
          <View style={styles.toolIconBox}>
            <Ionicons name="clipboard-outline" size={26} color={colors.primaryDark} />
          </View>
          <Text style={styles.toolLabel}>识别记录</Text>
          <Text style={styles.toolText}>查看历史参数</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.hint}>{imageUri ? '图片已选择，可开始识别。' : '拍摄或选择一张棉花图片后开始识别。'}</Text>
        <PrimaryButton
          title={isRecognizing ? '识别中...' : '开始识别'}
          onPress={onRecognize}
          disabled={!imageUri || isRecognizing}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewPanel: {
    flex: 1,
    margin: spacing.page,
    marginBottom: 12,
    borderRadius: spacing.radius,
    overflow: 'hidden',
    backgroundColor: '#0f2233',
    borderWidth: 1,
    borderColor: '#29475d',
    ...shadow,
  },
  previewHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#102b40',
    borderBottomWidth: 1,
    borderBottomColor: '#28495f',
  },
  panelKicker: {
    color: '#9ab4c8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  panelTitle: {
    color: '#f5f9fc',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 4,
  },
  statusBadge: {
    minWidth: 82,
    minHeight: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#263d4e',
    borderWidth: 1,
    borderColor: '#3c5a70',
  },
  statusBadgeReady: {
    backgroundColor: '#dff4ea',
    borderColor: '#96cdb3',
  },
  statusText: {
    color: '#cfdae3',
    fontSize: 12,
    fontWeight: '800',
  },
  statusTextReady: {
    color: colors.success,
  },
  previewViewport: {
    flex: 1,
    minHeight: 260,
    overflow: 'hidden',
    backgroundColor: '#c9dce9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  frameTopLeft: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 34,
    height: 34,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#ffffff',
    opacity: 0.82,
  },
  frameTopRight: {
    position: 'absolute',
    right: 18,
    top: 18,
    width: 34,
    height: 34,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderColor: '#ffffff',
    opacity: 0.82,
  },
  frameBottomLeft: {
    position: 'absolute',
    left: 18,
    bottom: 18,
    width: 34,
    height: 34,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ffffff',
    opacity: 0.82,
  },
  frameBottomRight: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 34,
    height: 34,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#ffffff',
    opacity: 0.82,
  },
  previewFooter: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#102b40',
    borderTopWidth: 1,
    borderTopColor: '#28495f',
  },
  previewMeta: {
    color: '#c6d4df',
    fontSize: 12,
    fontWeight: '700',
  },
  controls: {
    minHeight: 136,
    backgroundColor: colors.backgroundDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  toolCard: {
    width: 96,
    minHeight: 102,
    borderRadius: spacing.radius,
    backgroundColor: '#f8fbfd',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  toolIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  toolLabel: {
    color: colors.ink,
    fontSize: 14,
    marginTop: 8,
    fontWeight: '900',
  },
  toolText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '700',
    textAlign: 'center',
  },
  captureButton: {
    width: 130,
    minHeight: 112,
    borderRadius: spacing.radius,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#2f6d96',
    ...shadow,
  },
  captureIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: '#6fa4c5',
  },
  captureLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  captureText: {
    color: '#c8d9e6',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
  footer: {
    backgroundColor: colors.surface,
    padding: spacing.page,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  hint: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
});
