import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { TabKey } from '../types';

type TabConfig = {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const tabs: TabConfig[] = [
  { key: 'news', label: '前沿瞭望', icon: 'globe-outline', activeIcon: 'globe' },
  { key: 'standards', label: '分类标准', icon: 'book-outline', activeIcon: 'book' },
  { key: 'recognition', label: '智能识别', icon: 'scan-outline', activeIcon: 'scan' },
  { key: 'profile', label: '我的信息', icon: 'person-outline', activeIcon: 'person' },
];

export function TabShell({
  activeTab,
  onChangeTab,
  children,
}: {
  activeTab: TabKey;
  onChangeTab: (tab: TabKey) => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.shell}>
      <View style={styles.content}>{children}</View>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <AnimatedTabItem
              key={tab.key}
              tab={tab}
              active={active}
              onPress={() => onChangeTab(tab.key)}
            />
          );
        })}
      </View>
    </View>
  );
}

function AnimatedTabItem({
  tab,
  active,
  onPress,
}: {
  tab: TabConfig;
  active: boolean;
  onPress: () => void;
}) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  const inactiveOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const activeOpacity = progress;
  const activeScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });
  const indicatorScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: '#ece4f5', borderless: true }}
      hitSlop={8}
    >
      <View style={styles.iconStack}>
        <Animated.View style={[styles.iconLayer, { opacity: inactiveOpacity }]}>
          <Ionicons name={tab.icon} size={24} color={colors.tabMuted} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, { opacity: activeOpacity, transform: [{ scale: activeScale }] }]}>
          <Ionicons name={tab.activeIcon} size={24} color={colors.primary} />
        </Animated.View>
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
      <Animated.View
        style={[
          styles.tabIndicator,
          {
            opacity: activeOpacity,
            transform: [{ scaleX: indicatorScale }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#eee5f7',
    backgroundColor: 'rgba(255, 251, 255, 0.96)',
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabItem: {
    width: 84,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconStack: {
    width: 28,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    color: colors.tabMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  tabIndicator: {
    width: 24,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});
