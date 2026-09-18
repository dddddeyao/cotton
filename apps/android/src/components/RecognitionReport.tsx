import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatColorGrade, formatLeafGrade } from '../data/standardsData';
import { getPrimaryRecognitionImageUri } from '../services/recognitionImages';
import { recordTheme, spacing } from '../theme';
import { RecognitionMetric, RecognitionResult } from '../types';

export type ReportImagePreview = { title: string; uri: string };

type ReportRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

const emptyValue = '—';

function decimalText(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '';
  }

  return String(Number(value.toFixed(digits)));
}

function percentText(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '';
  }

  return `${Number((value * 100).toFixed(digits))}%`;
}

function pickValue(direct: string, metrics: RecognitionMetric[], hint: string) {
  if (direct) {
    return direct;
  }

  return metrics.find((metric) => metric.hint === hint)?.value ?? '';
}

// 去掉数值末尾的英文单位（如 px），界面只保留纯数字
function stripUnitText(value: string) {
  return value.replace(/\s*[A-Za-z]+\s*$/, '').trim();
}

/**
 * 识别结果内容块：三张样本预览 + 检测结果。
 * 检测记录列表与检测结果页共用同一份内容。
 */
export function RecognitionReport({
  result,
  onOpenImage,
}: {
  result: RecognitionResult;
  onOpenImage: (preview: ReportImagePreview) => void;
}) {
  const metrics = result.metrics || [];
  const detection = result.detectionResult;

  // 三张并排样本预览：原始样本 / 棉花区域 / 杂质区域
  // 原始样本只渲染检测时上传的原图（result.imageUri），不叠加任何界面元素
  const samples = [
    { key: 'source', label: '原始样本', uri: getPrimaryRecognitionImageUri(result) },
    { key: 'cotton', label: '棉花区域', uri: result.cottonMaskImage || result.cottonOverlayImage || '' },
    { key: 'impurity', label: '杂质区域', uri: result.impurityMaskImage || result.impurityOverlayImage || '' },
  ];

  const cottonAreaText =
    detection?.cottonArea === null || detection?.cottonArea === undefined
      ? ''
      : `${decimalText(detection.cottonArea)}%`;
  const impurityAreaText =
    detection?.impurityArea === null || detection?.impurityArea === undefined
      ? stripUnitText(pickValue('', metrics, 'impurityArea'))
      : decimalText(detection.impurityArea, 0);

  // 等级只显示数字：颜色等级「几级」前面的数字（二级 → 2），杂质等级叶屑代码（1）
  const colorGradeText =
    formatColorGrade(detection?.colorGrade) || formatColorGrade(pickValue('', metrics, 'colorGrade'));
  const impurityGradeText =
    formatLeafGrade(detection?.impurityGrade) || formatLeafGrade(pickValue('', metrics, 'impurityGrade'));

  const resultRows: ReportRow[] = [
    {
      label: '颜色等级',
      value: colorGradeText,
    },
    {
      label: '杂质等级',
      value: impurityGradeText,
    },
    {
      label: '棉花面积',
      value: pickValue(cottonAreaText, metrics, 'cottonArea'),
    },
    {
      label: '杂质面积',
      value: impurityAreaText,
    },
    {
      label: '面积比',
      value: pickValue(percentText(detection?.areaRatio), metrics, 'areaRatio'),
    },
    {
      label: '置信度',
      value: pickValue(percentText(result.confidence), metrics, 'confidence'),
      highlight: true,
    },
  ];

  return (
    <>
      <View style={styles.sampleRow}>
        {samples.map((sample) => (
          <SampleTile key={sample.key} label={sample.label} uri={sample.uri} onOpen={onOpenImage} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>检测结果</Text>
      <View style={styles.table}>
        {resultRows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={[styles.rowValue, row.highlight && styles.rowValueAccent]}>
              {row.value || emptyValue}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function SampleTile({
  label,
  uri,
  onOpen,
}: {
  label: string;
  uri: string;
  onOpen: (preview: ReportImagePreview) => void;
}) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [uri]);

  const isReady = Boolean(uri) && !hasError;

  return (
    <View style={styles.sampleTile}>
      <Text style={styles.sampleLabel} numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        style={styles.sampleViewport}
        onPress={() => isReady && onOpen({ title: label, uri })}
        disabled={!isReady}
        accessibilityRole="imagebutton"
        accessibilityLabel={`放大${label}`}
      >
        {isReady ? (
          <Image source={{ uri }} style={styles.sampleImage} resizeMode="cover" onError={() => setHasError(true)} />
        ) : (
          <Text style={styles.sampleEmptyText}>暂无</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sampleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sampleTile: {
    flex: 1,
  },
  // 图片名称：黑色、居中、字号略大，无背景色，仅用间距与图片区分
  sampleLabel: {
    color: '#000000',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
  },
  // 三张图片统一：白色底、极细浅灰边框、小圆角、无阴影
  sampleViewport: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: recordTheme.border,
    backgroundColor: recordTheme.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleImage: {
    width: '100%',
    height: '100%',
  },
  sampleEmptyText: {
    color: recordTheme.textMuted,
    fontSize: 12,
  },

  // “检测结果”自然存在于记录内容中，不使用独立卡片或分隔横线
  sectionTitle: {
    color: recordTheme.textStrong,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 0,
  },
  table: {
    marginTop: 2,
  },
  // 参数行更紧凑：缩小行高与字号，仍保持左侧标签、右侧数值两列对齐
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  // 左侧检测项目严格左对齐
  rowLabel: {
    width: 84,
    color: recordTheme.textLabel,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  // 右侧检测数值严格右对齐，形成整齐的两列
  rowValue: {
    flex: 1,
    color: recordTheme.textStrong,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'right',
  },
  // 仅“置信度”数值使用橙色强调
  rowValueAccent: {
    color: recordTheme.accent,
    fontWeight: '700',
  },
});
