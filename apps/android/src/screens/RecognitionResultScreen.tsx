import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SecondaryButton, StackPage } from '../components/common';
import { CottonFieldVisual } from '../components/visuals';
import { colors, shadow, spacing } from '../theme';
import { RecognitionResult } from '../types';

export function RecognitionResultScreen({
  result,
  onBack,
  onRetry,
}: {
  result: RecognitionResult;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <StackPage title="识别结果" onBack={onBack}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <View style={styles.resultImageCard}>
          {result.imageUri ? <Image source={{ uri: result.imageUri }} style={styles.resultImage} /> : <CottonFieldVisual compact />}
        </View>
        <View style={styles.resultSummary}>
          <View style={styles.resultTextBlock}>
            <Text style={styles.resultLabel}>识别等级</Text>
            <Text style={styles.resultGrade}>{result.grade}</Text>
          </View>
          <View style={styles.confidencePill}>
            <Text style={styles.confidenceText}>{Math.round(result.confidence * 100)}%</Text>
          </View>
        </View>
        <Text style={styles.resultConclusion}>{result.conclusion}</Text>
        <View style={styles.metricGrid}>
          {result.metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              {metric.hint ? <Text style={styles.metricHint}>{metric.hint}</Text> : null}
            </View>
          ))}
        </View>
        <SecondaryButton title="重新选择图片" onPress={onRetry} />
      </ScrollView>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.page,
    paddingBottom: 96,
  },
  resultImageCard: {
    height: 260,
    borderRadius: spacing.radius,
    overflow: 'hidden',
    backgroundColor: '#d6e7fb',
    ...shadow,
  },
  resultImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultSummary: {
    marginTop: 16,
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadow,
  },
  resultTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  resultLabel: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 4,
  },
  resultGrade: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  confidencePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  confidenceText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  resultConclusion: {
    color: '#555164',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  metricCard: {
    width: '48%',
    minHeight: 112,
    borderRadius: spacing.radius,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
  metricHint: {
    color: '#857b93',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
});
