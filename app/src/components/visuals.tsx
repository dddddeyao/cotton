import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, shadow, spacing } from '../theme';
import { NewsItem } from '../types';

export function CottonHero() {
  return (
    <View style={styles.hero}>
      <CottonFieldVisual compact />
    </View>
  );
}

export function CottonFieldVisual({ compact = false }: { compact?: boolean }) {
  const balls = compact
    ? [
        [20, 16, 42],
        [76, 26, 30],
        [128, 18, 38],
        [186, 30, 48],
        [238, 18, 34],
      ]
    : [
        [26, 42, 58],
        [98, 24, 46],
        [168, 54, 72],
        [246, 36, 52],
        [68, 150, 76],
        [176, 150, 62],
        [276, 142, 70],
      ];

  return (
    <View style={[styles.cottonVisual, compact && styles.cottonVisualCompact]}>
      <View style={styles.sunGlow} />
      <View style={styles.fieldHaze} />
      {balls.map(([left, top, size], index) => (
        <View
          key={`${left}-${top}-${size}`}
          style={[
            styles.cottonBall,
            {
              left,
              top,
              width: size,
              height: size,
              opacity: index % 2 === 0 ? 0.98 : 0.9,
            },
          ]}
        />
      ))}
      {[30, 88, 145, 214, 280].map((left, index) => (
        <View
          key={left}
          style={[
            styles.cottonStem,
            {
              left,
              height: compact ? 54 : 120,
              transform: [{ rotate: `${index % 2 === 0 ? -12 : 10}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function NewsThumb({ tone }: { tone: NewsItem['tone'] }) {
  const toneStyle = {
    blue: styles.thumbBlue,
    green: styles.thumbGreen,
    orange: styles.thumbOrange,
    purple: styles.thumbPurple,
  }[tone];

  return (
    <View style={[styles.newsThumb, toneStyle]}>
      <View style={styles.thumbCottonA} />
      <View style={styles.thumbCottonB} />
      <View style={styles.thumbCottonC} />
      <View style={styles.thumbLine} />
      <Text style={styles.thumbText}>棉</Text>
    </View>
  );
}

export function MiniChart() {
  const labels = ['11', '21', '31', '41', '51', '61', '22', '32', '42', '13', '23', '33'];

  return (
    <View style={styles.chart}>
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <View key={`h-${item}`} style={[styles.chartGridH, { top: 20 + item * 30 }]} />
      ))}
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <View key={`v-${item}`} style={[styles.chartGridV, { left: 30 + item * 48 }]} />
      ))}
      <View style={[styles.chartCurve, styles.chartCurveA]} />
      <View style={[styles.chartCurve, styles.chartCurveB]} />
      <View style={[styles.chartCurve, styles.chartCurveC]} />
      {labels.map((label, index) => (
        <Text
          key={label}
          style={[
            styles.chartLabel,
            {
              left: 46 + (index % 4) * 58,
              top: 26 + Math.floor(index / 4) * 45,
            },
          ]}
        >
          {label}
        </Text>
      ))}
      <Text style={styles.chartAxisY}>反射率(%)</Text>
      <Text style={styles.chartAxisX}>黄度(+b)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 188,
    borderRadius: spacing.radius,
    overflow: 'hidden',
    backgroundColor: '#b7d8ff',
    ...shadow,
  },
  cottonVisual: {
    height: 300,
    overflow: 'hidden',
    backgroundColor: '#86b8ee',
  },
  cottonVisualCompact: {
    height: 188,
  },
  sunGlow: {
    position: 'absolute',
    right: -50,
    top: -42,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ffc46d',
    opacity: 0.55,
  },
  fieldHaze: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    backgroundColor: 'rgba(126, 89, 64, 0.22)',
  },
  cottonStem: {
    position: 'absolute',
    bottom: -8,
    width: 3,
    borderRadius: 3,
    backgroundColor: '#806138',
  },
  cottonBall: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#fffaff',
    borderWidth: 1,
    borderColor: '#f0dfea',
  },
  newsThumb: {
    width: 112,
    height: 112,
    borderRadius: spacing.radius,
    overflow: 'hidden',
    marginRight: 14,
  },
  thumbBlue: {
    backgroundColor: '#cbe4ff',
  },
  thumbGreen: {
    backgroundColor: '#cdebd6',
  },
  thumbOrange: {
    backgroundColor: '#ffd9b0',
  },
  thumbPurple: {
    backgroundColor: '#e0d4ff',
  },
  thumbCottonA: {
    position: 'absolute',
    top: 20,
    left: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fffaff',
  },
  thumbCottonB: {
    position: 'absolute',
    top: 48,
    left: 56,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
  },
  thumbCottonC: {
    position: 'absolute',
    top: 38,
    left: 48,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff7fb',
  },
  thumbLine: {
    position: 'absolute',
    left: 22,
    bottom: 12,
    width: 76,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(89, 72, 44, 0.42)',
  },
  thumbText: {
    position: 'absolute',
    left: 12,
    bottom: 16,
    color: '#2c2b36',
    fontSize: 20,
    fontWeight: '800',
  },
  chart: {
    height: 230,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#fbf8ff',
    overflow: 'hidden',
    marginBottom: 18,
  },
  chartGridH: {
    position: 'absolute',
    left: 30,
    right: 20,
    height: 1,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#b6aeca',
  },
  chartGridV: {
    position: 'absolute',
    top: 14,
    bottom: 34,
    width: 1,
    borderLeftWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#b6aeca',
  },
  chartCurve: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#42414d',
  },
  chartCurveA: {
    left: 46,
    top: 76,
    width: 250,
    transform: [{ rotate: '12deg' }],
  },
  chartCurveB: {
    left: 82,
    top: 116,
    width: 230,
    transform: [{ rotate: '-18deg' }],
  },
  chartCurveC: {
    left: 108,
    top: 116,
    width: 164,
    transform: [{ rotate: '70deg' }],
  },
  chartLabel: {
    position: 'absolute',
    color: colors.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  chartAxisY: {
    position: 'absolute',
    left: -26,
    top: 92,
    color: colors.muted,
    fontSize: 12,
    transform: [{ rotate: '-90deg' }],
  },
  chartAxisX: {
    position: 'absolute',
    right: 18,
    bottom: 10,
    color: colors.muted,
    fontSize: 12,
  },
});
