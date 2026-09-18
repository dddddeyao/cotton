import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colorDetectionTip, colorGradeRows, leafGradeRows, standardParameterRows } from '../data/standardsData';
import { colors, spacing } from '../theme';

const COLOR_GRADE_CHART_URI = 'https://www.cottoninc.com/wp-content/uploads/2020/01/color-chart.jpg';
const DEFAULT_COLOR_CHART_ASPECT_RATIO = 1.36;

export function StandardsScreen() {
  const [chartImageFailed, setChartImageFailed] = React.useState(false);
  const [chartAspectRatio, setChartAspectRatio] = React.useState(DEFAULT_COLOR_CHART_ASPECT_RATIO);

  React.useEffect(() => {
    Image.getSize(
      COLOR_GRADE_CHART_URI,
      (width, height) => {
        if (width > 0 && height > 0) {
          setChartAspectRatio(width / height);
        }
      },
      () => {
        setChartImageFailed(true);
      },
    );
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.documentHeader}>
        <Text style={styles.documentEyebrow}>STANDARD PARAMETER SHEET</Text>
        <View style={styles.documentTitleRow}>
          <Text style={styles.documentTitle}>棉花分级检测标准</Text>
          <Text style={styles.standardCode}>STD-COTTON-01</Text>
        </View>
        <ParameterGrid rows={standardParameterRows} />
      </View>

      <Section title="颜色分级" index="01" />
      <View style={styles.protocolPanel}>
        <View style={styles.protocolRail} />
        <Text style={styles.paragraph}>
          根据 HVI 测试结果，基于反射率 Rd(%) 和黄度 +b 值确定棉花颜色等级。使用配套 HVI 检测仪器对标准样品的颜色参数进行测试，两个指标的交点落在等级图上即可确定棉花颜色级。
        </Text>
      </View>

      <View style={styles.subsectionHeader}>
        <Text style={styles.subheading}>颜色级参考图</Text>
      </View>
      <View style={styles.referenceImageFrame}>
        <View style={styles.referenceViewport}>
          {chartImageFailed ? (
            <View style={styles.referenceImageFallback}>
              <Text style={styles.referenceImageFallbackTitle}>颜色级参考图加载失败</Text>
              <Text style={styles.referenceImageFallbackText}>等待替换为本地图源，不使用临时示意图。</Text>
            </View>
          ) : (
            <Image
              source={{ uri: COLOR_GRADE_CHART_URI }}
              style={[styles.referenceImage, { aspectRatio: chartAspectRatio }]}
              resizeMode="contain"
              onError={() => setChartImageFailed(true)}
            />
          )}
        </View>
      </View>

      <TableTitle title="颜色等级参数表" />
      <StandardTable headers={['级别', '反射率(%)', '黄度(+b)', '备注']} rows={colorGradeRows} columnWeights={[1.05, 1, 1, 1.45]} />
      <View style={styles.tipPanel}>
        <Text style={styles.tipTitle}>检测提示</Text>
        <Text style={styles.tipText}>{colorDetectionTip}</Text>
      </View>

      <Section title="杂质分级" index="02" />
      <View style={styles.protocolPanel}>
        <View style={styles.protocolRail} />
        <Text style={styles.paragraph}>
          根据叶屑含量对棉花进行分级，叶屑是指轧花后残留在棉花中的小棉花叶颗粒。陆地棉有 7 个叶屑等级，有实物标准；第 8 个级外等级表示比 7 级更差。
        </Text>
      </View>
      <TableTitle title="叶屑等级参数表" />
      <StandardTable headers={['叶屑代码', '叶屑等级', '符号', '杂质所占的面积/%']} rows={leafGradeRows} columnWeights={[0.85, 1.35, 0.85, 1.35]} />
    </ScrollView>
  );
}

function Section({ index, title }: { index: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIndex}>{index}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function ParameterGrid({ rows }: { rows: string[][] }) {
  return (
    <View style={styles.parameterGrid}>
      {rows.map((row, index) => (
        <View
          key={row.join('-')}
          style={[
            styles.parameterCell,
            index % 2 === 0 && styles.parameterCellLeft,
            index < rows.length - 2 && styles.parameterCellTopRow,
          ]}
        >
          <Text style={styles.parameterLabel}>{row[0]}</Text>
          <Text style={styles.parameterValue}>{row[1]}</Text>
        </View>
      ))}
    </View>
  );
}

function TableTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={styles.tableTitleRow}>
      <Text style={styles.tableTitle}>{title}</Text>
      {meta ? <Text style={styles.tableTitleMeta}>{meta}</Text> : null}
    </View>
  );
}

function StandardTable({
  columnWeights,
  headers,
  rows,
}: {
  columnWeights: number[];
  headers: string[];
  rows: string[][];
}) {
  return (
    <View style={styles.standardTable}>
      <View style={styles.standardTableHeaderRow}>
        {headers.map((header, index) => (
          <Text key={header} style={[styles.standardHeaderCell, { flex: columnWeights[index] ?? 1 }]}>
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={row.join('-')} style={[styles.standardTableRow, rowIndex % 2 === 1 && styles.standardTableRowAlt]}>
          {row.map((cell, index) => (
            <Text key={cell + '-' + index} style={[styles.standardCell, { flex: columnWeights[index] ?? 1 }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 32,
    backgroundColor: colors.background,
  },
  documentHeader: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: '#bed4dd',
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 12,
  },
  documentEyebrow: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 8,
  },
  documentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  standardCode: {
    borderWidth: 1,
    borderColor: '#b8cad3',
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: '#f5fafc',
  },
  parameterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#ffffff',
    marginTop: 16,
  },
  parameterCell: {
    width: '50%',
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  parameterCellLeft: {
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  parameterCellTopRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  parameterLabel: {
    color: '#556473',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 5,
  },
  parameterValue: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  documentTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  sectionHeader: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: '#bcd2dc',
    backgroundColor: '#f0f8fb',
    marginTop: 4,
    marginBottom: 8,
  },
  sectionIndex: {
    width: 44,
    alignSelf: 'stretch',
    textAlign: 'center',
    textAlignVertical: 'center',
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 12,
  },
  protocolPanel: {
    flexDirection: 'row',
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 12,
    marginBottom: 12,
  },
  protocolRail: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: colors.primaryDark,
    marginRight: 10,
  },
  paragraph: {
    flex: 1,
    color: '#253240',
    fontSize: 13,
    lineHeight: 20,
  },
  subsectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subheading: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  referenceImageFrame: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: '#bcd2dc',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    marginHorizontal: -6,
    marginBottom: 10,
  },
  referenceViewport: {
    overflow: 'hidden',
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  referenceImage: {
    width: '100%',
  },
  referenceImageFallback: {
    aspectRatio: 1.36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: '#ffffff',
  },
  referenceImageFallbackTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  referenceImageFallbackText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    marginTop: 6,
    textAlign: 'center',
  },
  tableTitleRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  tableTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  tableTitleMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  tipPanel: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 13,
    marginBottom: 12,
  },
  tipTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },
  tipText: {
    color: '#394958',
    fontSize: 13,
    lineHeight: 20,
  },
  standardTable: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: '#bcd2dc',
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#ffffff',
  },
  standardTableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#e8f3f7',
    borderBottomWidth: 1,
    borderBottomColor: '#bcd2dc',
  },
  standardHeaderCell: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    paddingHorizontal: 6,
    paddingVertical: 7,
    textAlign: 'center',
  },
  standardTableRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5eff3',
    backgroundColor: '#ffffff',
  },
  standardTableRowAlt: {
    backgroundColor: '#fbfdfe',
  },
  standardCell: {
    color: '#253240',
    fontSize: 11,
    lineHeight: 15,
    paddingHorizontal: 6,
    paddingVertical: 6,
    textAlign: 'center',
  },
});