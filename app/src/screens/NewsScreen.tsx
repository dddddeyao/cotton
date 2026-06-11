import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EmptyState } from '../components/common';
import { CottonHero, NewsThumb } from '../components/visuals';
import { colors, shadow, spacing } from '../theme';
import { NewsItem } from '../types';

export function NewsScreen({ news }: { news: NewsItem[] }) {
  const [query, setQuery] = useState('');
  const filteredNews = useMemo(() => {
    const normalized = query.trim();
    if (!normalized) {
      return news;
    }

    return news.filter((item) => `${item.title}${item.summary}${item.source}`.includes(normalized));
  }, [news, query]);

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <CottonHero />
      <View style={styles.searchBox}>
        <Ionicons name="search" size={30} color="#7f748d" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索"
          placeholderTextColor="#a79db5"
          style={styles.searchInput}
        />
      </View>

      {filteredNews.map((item) => (
        <View key={item.id} style={styles.newsCard}>
          <NewsThumb tone={item.tone} />
          <View style={styles.newsBody}>
            <Text style={styles.newsTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.newsSummary} numberOfLines={3}>
              {item.summary}
            </Text>
            <Text style={styles.newsDate}>
              {item.date} · {item.source}
            </Text>
          </View>
        </View>
      ))}

      {filteredNews.length === 0 ? <EmptyState title="没有找到相关新闻" /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.page,
    paddingBottom: 96,
  },
  searchBox: {
    minHeight: 70,
    borderRadius: 35,
    backgroundColor: '#fff8ff',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
    paddingHorizontal: 22,
    gap: 14,
    ...shadow,
  },
  searchInput: {
    flex: 1,
    fontSize: 22,
    color: colors.ink,
    minHeight: 60,
  },
  newsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: spacing.radius,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#f0e4fa',
    ...shadow,
  },
  newsBody: {
    flex: 1,
    minWidth: 0,
  },
  newsTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  newsSummary: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4,
  },
  newsDate: {
    color: '#8c829b',
    fontSize: 14,
    marginTop: 4,
  },
});
