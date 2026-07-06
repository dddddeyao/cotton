import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState, StackPage } from '../components/common';
import { colors, shadow, spacing } from '../theme';
import { RecognitionMetric, RecognitionResult } from '../types';

function buildParameterCells(item: RecognitionResult): RecognitionMetric[] {
  return [
    { label: '识别等级', value: item.grade },
    { label: '模型置信度', value: `${Math.round(item.confidence * 100)}%` },
    { label: '采集时间', value: item.createdAt },
    ...(item.metrics || []).slice(0, 6),
  ];
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
            const parameterCells = buildParameterCells(item);

            return (
              <View key={item.id} style={[styles.historyCard, selected && styles.historyCardSelected]}>
                <View style={styles.cardHeader}>
                  <Pressable style={[styles.checkCircle, selected && styles.checkCircleActive]} onPress={() => toggle(item.id)}>
                    <Text style={styles.checkText}>{selected ? '✓' : ''}</Text>
                  </Pressable>
                  <View style={styles.recordTitleBlock}>
                    <Text style={styles.recordKicker}>RECOGNITION RECORD</Text>
                    <Text style={styles.recordTitle}>样本参数记录</Text>
                  </View>
                  <Pressable style={styles.openButton} onPress={() => onOpenResult(item)} accessibilityRole="button">
                    <Text style={styles.openButtonText}>查看详情</Text>
                  </Pressable>
                </View>

                <Pressable style={styles.recordBody} onPress={() => onOpenResult(item)} accessibilityRole="button">
                  <View style={styles.historyThumb}>
                    {item.imageUri ? (
                      <Image source={{ uri: item.imageUri }} style={styles.historyImage} />
                    ) : (
                      <View style={styles.emptyThumbContent}>
                        <Text style={styles.historyThumbText}>AI</Text>
                        <Text style={styles.historyThumbSubText}>No image</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.parameterGrid}>
                    {parameterCells.map((metric, index) => (
                      <View key={`${metric.label}-${index}`} style={styles.parameterCell}>
                        <Text style={styles.parameterLabel} numberOfLines={1}>
                          {metric.label}
                        </Text>
                        <Text style={styles.parameterValue} numberOfLines={2}>
                          {metric.value}
                        </Text>
                      </View>
                    ))}
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
          <Text style={styles.selectionText}>已选 {selectedIds.length} 项</Text>
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
    backgroundColor: colors.background,
  },
  page: {
    padding: spacing.page,
    paddingBottom: 104,
  },
  historyCard: {
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow,
  },
  historyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#f8fbfd',
  },
  cardHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8ea0af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#ffffff',
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
  recordTitleBlock: {
    flex: 1,
  },
  recordKicker: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  recordTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  openButton: {
    minWidth: 76,
    minHeight: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#b7cfdf',
  },
  openButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  recordBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  historyThumb: {
    width: 92,
    minHeight: 132,
    borderRadius: spacing.radius,
    backgroundColor: '#dce8f1',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#c3d2dd',
  },
  historyImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyThumbContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyThumbText: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: '900',
  },
  historyThumbSubText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  parameterGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginLeft: 10,
  },
  parameterCell: {
    width: '47.5%',
    minHeight: 58,
    borderRadius: spacing.radius,
    backgroundColor: '#f5f8fb',
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  parameterLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  parameterValue: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  actions: {
    minHeight: 76,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  selectionText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  deleteButton: {
    minWidth: 96,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    backgroundColor: '#d8a6a1',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});
