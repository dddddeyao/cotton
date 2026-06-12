import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DataTable } from '../components/common';
import { MiniChart } from '../components/visuals';
import { colorGradeRows, leafGradeRows } from '../data/mockData';
import { colors, spacing } from '../theme';

export function StandardsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.titleBand}>
        <Text style={styles.centerTitle}>棉花智能(AI)识别采集说明</Text>
      </View>
      <SectionTitle index="一" title="颜色分级" />
      <Text style={styles.paragraph}>
        根据 HVI 测试结果，基于反射率(%)和黄度(+b)值确定棉花颜色等级。使用配套的 HVI
        检测仪器对标准样品的颜色参数进行测试，两个指标的值的交点落在 Hunter Lab 等级图上就能确定棉花的颜色级。
      </Text>
      <Text style={styles.subheading}>棉花实物标准数值</Text>
      <MiniChart />
      <DataTable headers={['级别', '反射率(%)', '黄度(+b)', '备注']} rows={colorGradeRows} />

      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          注：棉花随存放时间延长，反射率下降、黄度增加。显示的标准样品中，2级因存放时间较长不达标，建议使用新棉花样品补充图片。
        </Text>
      </View>

      <SectionTitle index="二" title="杂质分级" />
      <Text style={styles.paragraph}>
        根据叶屑含量对棉花进行分级，叶屑是指轧花后残留在棉花中的小棉花叶颗粒。陆地棉有 7 个叶屑等级，有实物标准。美国农业部增加了第 8 个级外等级，比 7
        级更差。
      </Text>
      <DataTable headers={['叶屑代码', '叶屑等级', '符号', '杂质面积/%']} rows={leafGradeRows} />
    </ScrollView>
  );
}

function SectionTitle({ index, title }: { index: string; title: string }) {
  return (
    <Text style={styles.sectionTitle}>
      {index}、{title}
    </Text>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.page,
    paddingBottom: 104,
    backgroundColor: colors.surfaceStrong,
  },
  titleBand: {
    marginHorizontal: -spacing.page,
    marginTop: -spacing.page,
    marginBottom: 34,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e8deef',
  },
  centerTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 18,
  },
  paragraph: {
    color: '#464253',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 18,
  },
  subheading: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },
  noteBox: {
    backgroundColor: '#f7f0ff',
    borderRadius: spacing.radius,
    padding: 14,
    marginBottom: 38,
  },
  noteText: {
    color: '#5a5366',
    fontSize: 14,
    lineHeight: 21,
  },
});
