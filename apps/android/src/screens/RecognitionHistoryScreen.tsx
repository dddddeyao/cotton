import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { EmptyState, StackPage } from '../components/common';
import { ImagePreviewModal, PreviewImage } from '../components/ImagePreviewModal';
import { RecognitionReport } from '../components/RecognitionReport';
import { recordTheme, spacing } from '../theme';
import { RecognitionResult } from '../types';
import { formatTimestamp } from '../utils/format';
import { getAndroidBottomInset } from '../utils/safeArea';

const actionBarBaseHeight = 62;
const actionBarVerticalPadding = 10;
const pagePadding = 12;
const recordGap = 12;

export function RecognitionHistoryScreen({
  history,
  onBack,
  onDelete,
}: {
  history: RecognitionResult[];
  onBack: () => void;
  onDelete: (ids: string[]) => void | Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<PreviewImage>(null);
  const allSelected = history.length > 0 && selectedIds.length === history.length;
  const { height } = useWindowDimensions();
  const bottomInset = getAndroidBottomInset(height);

  useEffect(() => {
    const availableIds = new Set(history.map((item) => item.id));
    setSelectedIds((current) => current.filter((id) => availableIds.has(id)));
  }, [history]);

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <StackPage title="识别记录" onBack={onBack} centerTitle tone="neutral">
      <View style={styles.root}>
        <ScrollView style={styles.list} contentContainerStyle={[styles.page, { paddingBottom: 92 + bottomInset }]} showsVerticalScrollIndicator={false}>
          {history.map((item) => {
            const selected = selectedIds.includes(item.id);
            const detectedAt = formatTimestamp(item.createdAt || item.timestamp);

            return (
              <View key={item.id} style={[styles.recordPanel, selected && styles.recordPanelSelected]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.recordTime} numberOfLines={1}>
                    {detectedAt || '—'}
                  </Text>
                  <Pressable
                    style={[styles.checkBox, selected && styles.checkBoxActive]}
                    onPress={() => toggle(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityLabel="选择该条检测记录"
                  >
                    <Text style={styles.checkText}>{selected ? '✓' : ''}</Text>
                  </Pressable>
                </View>

                <View style={styles.recordBody}>
                  <RecognitionReport result={item} onOpenImage={setPreviewImage} />
                </View>
              </View>
            );
          })}
          {history.length === 0 ? <EmptyState title="暂无检测记录" /> : null}
        </ScrollView>
        <ImagePreviewModal preview={previewImage} onClose={() => setPreviewImage(null)} />
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
            <Text style={styles.deleteButtonText}>{isDeleting ? '删除中...' : '删除'}</Text>
          </Pressable>
        </View>
      </View>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: recordTheme.pageBackground,
  },
  list: {
    flex: 1,
  },
  page: {
    paddingHorizontal: pagePadding,
    paddingTop: pagePadding,
  },
  // 每条识别记录：白色内容区 + 极细浅灰边框 + 小圆角，无阴影、无渐变
  recordPanel: {
    backgroundColor: recordTheme.surface,
    borderWidth: 1,
    borderColor: recordTheme.border,
    borderRadius: spacing.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: recordGap,
  },
  recordPanelSelected: {
    borderColor: recordTheme.borderStrong,
  },
  cardHeader: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordTime: {
    flex: 1,
    color: recordTheme.textMuted,
    fontSize: 13,
    marginRight: 10,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: recordTheme.checkBorder,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: recordTheme.surface,
  },
  checkBoxActive: {
    backgroundColor: recordTheme.checkActive,
    borderColor: recordTheme.checkActive,
  },
  checkText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  recordBody: {
    paddingTop: 10,
  },
  actions: {
    minHeight: actionBarBaseHeight,
    borderTopWidth: 1,
    borderTopColor: recordTheme.border,
    backgroundColor: recordTheme.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: actionBarVerticalPadding,
    paddingBottom: actionBarVerticalPadding,
    paddingHorizontal: 16,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllText: {
    color: recordTheme.textStrong,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    minWidth: 92,
    minHeight: 38,
    borderRadius: spacing.radius,
    backgroundColor: recordTheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: recordTheme.disabled,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
