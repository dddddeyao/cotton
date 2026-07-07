import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Platform, Pressable, StatusBar as NativeStatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, spacing } from '../theme';
import { TabKey } from '../types';

type TabConfig = {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const androidBottomInsetFallback = 16;
const androidBottomInsetMax = 48;
const tabBarHeight = 64;
const tabBarBottomPadding = 8;
const tabItemHeight = 50;

function getAndroidBottomInset(windowHeight: number) {
  if (Platform.OS !== 'android') {
    return 0;
  }

  const screenHeight = Dimensions.get('screen').height;
  const statusBarHeight = NativeStatusBar.currentHeight ?? 0;
  const systemBarsHeight = Math.max(0, Math.round(screenHeight - windowHeight));
  const navigationBarHeight = Math.max(0, systemBarsHeight - statusBarHeight);

  return Math.min(Math.max(navigationBarHeight, androidBottomInsetFallback), androidBottomInsetMax);
}

const tabs: TabConfig[] = [
  { key: 'news', label: '前沿瞭望', icon: 'newspaper-outline' },
  { key: 'standards', label: '分类标准', icon: 'library-outline' },
  { key: 'recognition', label: '图像检测', icon: 'scan-outline' },
  { key: 'profile', label: '我的信息', icon: 'person-circle-outline' },
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
  const { height } = useWindowDimensions();
  const bottomInset = getAndroidBottomInset(height);

  return (
    <View style={styles.shell}>
      <View style={styles.content}>{children}</View>
      <View style={[styles.tabBar, { minHeight: tabBarHeight + bottomInset, paddingBottom: tabBarBottomPadding + bottomInset }]}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;

          return (
            <Pressable
              key={tab.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => onChangeTab(tab.key)}
              accessibilityRole="button"
              android_ripple={{ color: '#e7f4f8', borderless: false }}
            >
              <Ionicons name={tab.icon} size={20} color={active ? colors.primaryDark : colors.tabMuted} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    minHeight: tabBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingBottom: tabBarBottomPadding,
    paddingTop: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    height: tabItemHeight,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabItemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.line,
  },
  tabLabel: {
    color: colors.tabMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  tabLabelActive: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
});
