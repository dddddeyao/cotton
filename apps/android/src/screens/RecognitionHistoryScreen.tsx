import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, StackPage } from '../components/common';
import { colors, shadow, spacing } from '../theme';
import { RecognitionResult } from '../types';

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
  const allSelected = history.length > 0 && selectedIds.length === history.length;

  useEffect(() => {
    const availableIds = new Set(history.map((item) => item.id));
    setSelectedIds((current) => current.filter((id) => availableIds.has(id)));
  }, [history]);

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <StackPage title="识别记录" onBack={onBack}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          {history.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <View key={item.id} style={styles.historyCard}>
                <Pressable style={[styles.checkCircle, selected && styles.checkCircleActive]} onPress={() => toggle(item.id)}>
                  <Text style={styles.checkText}>{selected ? '✓' : ''}</Text>
                </Pressable>
                <Pressable style={styles.historyOpenArea} onPress={() => onOpenResult(item)} accessibilityRole="button">
                  <View style={styles.historyThumb}>
                    {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.historyImage} /> : <Text style={styles.historyThumbText}>AI</Text>}
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyTitle}>{item.grade}</Text>
                    <Text style={styles.historyMeta}>{item.createdAt}</Text>
                    <Text style={styles.historyMeta}>置信度 {Math.round(item.confidence * 100)}%</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
          {history.length === 0 ? <EmptyState title="暂无识别记录" /> : null}
        </ScrollView>
        <View style={styles.actions}>
          <Pressable
            style={styles.selectAll}
            onPress={() => setSelectedIds(allSelected ? [] : history.map((item) => item.id))}
            accessibilityRole="button"
          >
            <View style={[styles.checkCircle, allSelected && styles.checkCircleActive]}>
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
  },
  page: {
    padding: spacing.page,
    paddingBottom: 96,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#efe5f7',
    ...shadow,
  },
  historyOpenArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfb6cb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  checkCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  historyThumb: {
    width: 62,
    height: 62,
    borderRadius: spacing.radius,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyImage: {
    width: '100%',
    height: '100%',
  },
  historyThumbText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  historyTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  historyMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 3,
  },
  actions: {
    minHeight: 74,
    borderTopWidth: 1,
    borderTopColor: '#efe5f7',
    backgroundColor: '#fff9ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    color: colors.ink,
    fontSize: 16,
  },
  deleteButton: {
    minWidth: 116,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#efb7aa',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
