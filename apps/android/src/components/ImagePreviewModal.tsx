import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { recordTheme, spacing } from '../theme';

export type PreviewImage = { title: string; uri: string } | null;

export function ImagePreviewModal({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: PreviewImage;
}) {
  const [hasError, setHasError] = React.useState(false);
  const { height } = useWindowDimensions();
  const previewHeight = Math.max(260, Math.round(height * 0.72));

  React.useEffect(() => {
    setHasError(false);
  }, [preview?.uri]);

  return (
    <Modal visible={Boolean(preview)} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissLayer} onPress={onClose} accessibilityRole="button" accessibilityLabel="关闭预览" />
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{preview?.title}</Text>
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="关闭预览">
              <Text style={styles.closeText}>关闭</Text>
            </Pressable>
          </View>
          <View style={[styles.body, { height: previewHeight }]}>
            {preview && !hasError ? (
              <Image source={{ uri: preview.uri }} style={styles.image} resizeMode="contain" onError={() => setHasError(true)} />
            ) : (
              <Text style={styles.errorText}>图像加载失败</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 18, 28, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  dismissLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  panel: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    borderRadius: spacing.radius,
    overflow: 'hidden',
    backgroundColor: recordTheme.surface,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: recordTheme.border,
    paddingHorizontal: 12,
  },
  title: {
    flex: 1,
    color: recordTheme.textStrong,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 10,
  },
  closeButton: {
    minWidth: 58,
    minHeight: 32,
    borderRadius: spacing.radius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: recordTheme.border,
  },
  closeText: {
    color: recordTheme.textLabel,
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: recordTheme.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
