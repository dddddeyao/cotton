import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../components/common';
import { CottonFieldVisual } from '../components/visuals';
import { colors, spacing } from '../theme';

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
      <View style={styles.preview}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : <CottonFieldVisual />}
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.modeButton} onPress={() => onPickImage('library')} accessibilityRole="button">
          <Ionicons name="image-outline" size={50} color="#252230" />
          <Text style={styles.modeLabel}>相册模式</Text>
        </Pressable>
        <Pressable style={styles.cameraButton} onPress={() => onPickImage('camera')} accessibilityRole="button">
          <Ionicons name="camera" size={48} color="#373342" />
        </Pressable>
        <Pressable style={styles.modeButton} onPress={onOpenHistory} accessibilityRole="button">
          <Ionicons name="clipboard-outline" size={50} color="#252230" />
          <Text style={styles.modeLabel}>识别记录</Text>
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
  preview: {
    flex: 1,
    backgroundColor: '#ccdff3',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  controls: {
    minHeight: 144,
    backgroundColor: '#9791a4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 22,
  },
  modeButton: {
    width: 94,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    color: '#272431',
    fontSize: 15,
    marginTop: 4,
    fontWeight: '700',
  },
  cameraButton: {
    width: 154,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#fff9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    backgroundColor: '#fff9ff',
    padding: spacing.page,
    gap: 12,
  },
  hint: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
});
