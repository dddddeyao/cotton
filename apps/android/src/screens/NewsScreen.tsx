import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  ListRenderItem,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { EmptyState } from '../components/common';
import { hasRealNewsImage } from '../services/newsImages';
import { colors, shadow, spacing } from '../theme';
import { NewsItem } from '../types';
import { formatDate } from '../utils/format';

const NEWS_PAGE_SIZE = 10;

// 前沿瞭望顶部横幅（图片已裁为 799×400 的横幅比例）
const newsBanner = require('../../assets/news-banner.jpg');
const NEWS_BANNER_RATIO = 799 / 400;

type NewsImageLoadEvent = NativeSyntheticEvent<{
  source?: {
    width?: number;
    height?: number;
  };
}>;

function formatRefreshTime(timestamp: number) {
  const date = new Date(timestamp);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

type NewsScreenProps = {
  news: NewsItem[];
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  updatedAt: number | null;
  onRefresh: () => void;
  onLoadMore: () => void;
  onOpenNews: (item: NewsItem) => void;
};

export function NewsScreen({
  news,
  isRefreshing,
  isLoadingMore,
  hasMore,
  updatedAt,
  onRefresh,
  onLoadMore,
  onOpenNews,
}: NewsScreenProps) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const [failedImageUris, setFailedImageUris] = useState<Set<string>>(() => new Set());
  const refreshProgress = useRef(new Animated.Value(0)).current;
  const filteredNews = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return news;
    }

    return news.filter((item) =>
      `${item.title}${item.summary}${item.source}${item.category}${item.keywords}`.toLowerCase().includes(normalized),
    );
  }, [news, query]);
  const visibleNews = useMemo(() => filteredNews.slice(0, visibleCount), [filteredNews, visibleCount]);
  const hasLocalHiddenNews = visibleCount < filteredNews.length;
  const { width: windowWidth } = useWindowDimensions();
  const contentWidth = Math.max(1, windowWidth - spacing.page * 2);
  // 横幅宽高按图片真实比例显式计算，不依赖 aspectRatio，避免比例失衡
  const bannerHeight = Math.round(contentWidth / NEWS_BANNER_RATIO);
  const trimmedQuery = query.trim();
  const refreshRotate = refreshProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    setVisibleCount(NEWS_PAGE_SIZE);
  }, [query]);

  useEffect(() => {
    if (!isRefreshing) {
      refreshProgress.stopAnimation();
      refreshProgress.setValue(0);
      return undefined;
    }

    const refreshLoop = Animated.loop(
      Animated.timing(refreshProgress, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    refreshLoop.start();

    return () => refreshLoop.stop();
  }, [isRefreshing, refreshProgress]);

  const handleLoadMore = useCallback(() => {
    if (hasLocalHiddenNews) {
      setVisibleCount((current) => Math.min(current + NEWS_PAGE_SIZE, filteredNews.length));
      return;
    }

    onLoadMore();
  }, [filteredNews.length, hasLocalHiddenNews, onLoadMore]);

  const hideNewsImage = useCallback((uri: string) => {
    if (!uri) {
      return;
    }

    setFailedImageUris((current) => {
      if (current.has(uri)) {
        return current;
      }

      const next = new Set(current);
      next.add(uri);
      return next;
    });
  }, []);

  const handleNewsImageLoad = useCallback(
    (uri: string, event: NewsImageLoadEvent) => {
      const width = Number(event.nativeEvent.source?.width ?? 0);
      const height = Number(event.nativeEvent.source?.height ?? 0);

      if ((width > 0 && width < 260) || (height > 0 && height < 120)) {
        hideNewsImage(uri);
      }
    },
    [hideNewsImage],
  );

  const renderNewsItem: ListRenderItem<NewsItem> = ({ item }) => {
    const hasDisplayImage = hasRealNewsImage(item.imageUrl) && !failedImageUris.has(item.imageUrl);
    const formattedDate = item.date ? formatDate(item.date) : '';

    return (
      <Pressable
        style={({ pressed }) => [
          styles.newsCard,
          !hasDisplayImage && styles.newsCardTextOnly,
          pressed && styles.newsCardPressed,
        ]}
        onPress={() => onOpenNews(item)}
        accessibilityRole="button"
      >
        {hasDisplayImage ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.newsImage}
            onLoad={(event) => handleNewsImageLoad(item.imageUrl, event)}
            onError={() => hideNewsImage(item.imageUrl)}
          />
        ) : null}
        <View style={styles.newsBody}>
          <Text style={styles.newsTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {formattedDate ? <Text style={styles.newsDate}>{formattedDate}</Text> : null}
          {item.summary ? (
            <Text style={styles.newsSummary} numberOfLines={3}>
              {item.summary}
            </Text>
          ) : null}
          <View style={styles.cardFooter}>
            <View style={styles.openHint}>
              <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  const emptyTitle = trimmedQuery ? '未找到匹配资讯' : '暂无棉花资讯';
  const emptyText = trimmedQuery ? '换一个关键词再试。' : '当前没有可展示的棉花资讯。';

  return (
    <FlatList
      data={visibleNews}
      keyExtractor={(item) => item.id}
      renderItem={renderNewsItem}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.45}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primaryDark}
          colors={[colors.primaryDark]}
        />
      }
      ListHeaderComponent={
        <>
          {/* 页面最顶部横幅（静态图），宽高按图片真实比例计算，等比显示不变形 */}
          <Image
            source={newsBanner}
            style={[styles.newsBanner, { width: contentWidth, height: bannerHeight }]}
            resizeMode="cover"
          />

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={22} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="输入关键词"
              placeholderTextColor="#8a979f"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.listHeaderText}>行业新闻</Text>
            <Pressable
              style={({ pressed }) => [styles.refreshButton, pressed && { opacity: 0.72 }]}
              onPress={onRefresh}
              accessibilityRole="button"
            >
              <Animated.View style={isRefreshing ? { transform: [{ rotate: refreshRotate }] } : null}>
                <Ionicons name="refresh-outline" size={20} color={colors.primaryDark} />
              </Animated.View>
              {updatedAt && !isRefreshing ? (
                <Text style={styles.refreshText}>已更新 {formatRefreshTime(updatedAt)}</Text>
              ) : null}
            </Pressable>
          </View>
        </>
      }
      ListEmptyComponent={<EmptyState title={emptyTitle} text={emptyText} />}
      ListFooterComponent={
        visibleNews.length > 0 ? (
          <Text style={styles.footerText}>{isLoadingMore ? '加载中' : hasLocalHiddenNews || hasMore ? '继续下滑加载' : '没有更多'}</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  page: {
    padding: spacing.page,
    paddingBottom: 96,
    backgroundColor: colors.background,
  },
  // 顶部横幅（静态图）：尺寸由 JS 按图片真实比例算出，这里只负责外观
  newsBanner: {
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 12,
  },
  searchBox: {
    minHeight: 48,
    borderRadius: spacing.radius,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    minHeight: 44,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  listHeaderText: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  refreshText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  newsCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.radius,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadow,
  },
  newsCardPressed: {
    opacity: 0.72,
  },
  newsCardTextOnly: {
    overflow: 'visible',
  },
  newsImage: {
    width: '100%',
    height: 142,
    resizeMode: 'cover',
  },
  newsBody: {
    padding: 12,
  },
  newsTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  newsSummary: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  newsDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  footerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 18,
  },
});
