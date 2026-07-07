import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
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

const NEWS_PAGE_SIZE = 10;

function formatRefreshTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(NEWS_PAGE_SIZE);
  const [failedImageUris, setFailedImageUris] = useState<Set<string>>(() => new Set());
  const refreshProgress = useRef(new Animated.Value(0)).current;
  const imageNews = useMemo(
    () => news.filter((item) => hasRealNewsImage(item.imageUrl) && !failedImageUris.has(item.imageUrl)).slice(0, 5),
    [failedImageUris, news],
  );
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
  const refreshText = isRefreshing ? '更新中' : updatedAt ? '已更新 ' + formatRefreshTime(updatedAt) : '下拉刷新';
  const categoryCount = useMemo(() => new Set(news.map((item) => item.category).filter(Boolean)).size, [news]);
  const monitorMetrics = useMemo(
    () => [
      { label: '分类', value: String(categoryCount).padStart(2, '0') },
      { label: '图像', value: String(imageNews.length).padStart(2, '0') },
    ],
    [categoryCount, imageNews.length],
  );
  const carouselScrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  const carouselWidth = Math.max(1, windowWidth - spacing.page * 2);
  const refreshRotate = refreshProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scrollToSlide = useCallback(
    (index: number, animated = true) => {
      const boundedIndex = Math.min(Math.max(index, 0), Math.max(imageNews.length - 1, 0));
      setActiveSlideIndex(boundedIndex);
      carouselScrollRef.current?.scrollTo({ x: boundedIndex * carouselWidth, animated });
    },
    [carouselWidth, imageNews.length],
  );

  const handleCarouselMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
      setActiveSlideIndex(Math.min(Math.max(nextIndex, 0), Math.max(imageNews.length - 1, 0)));
    },
    [carouselWidth, imageNews.length],
  );
  useEffect(() => {
    setActiveSlideIndex(0);
    carouselScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [imageNews.length]);

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

  useEffect(() => {
    if (imageNews.length <= 1) {
      return undefined;
    }

    const timer = setInterval(() => {
      setActiveSlideIndex((current) => {
        const next = (current + 1) % imageNews.length;
        carouselScrollRef.current?.scrollTo({ x: next * carouselWidth, animated: true });
        return next;
      });
    }, 4200);

    return () => clearInterval(timer);
  }, [carouselWidth, imageNews.length]);

  const handleLoadMore = useCallback(() => {
    if (hasLocalHiddenNews) {
      setVisibleCount((current) => Math.min(current + NEWS_PAGE_SIZE, filteredNews.length));
      return;
    }

    onLoadMore();
  }, [filteredNews.length, hasLocalHiddenNews, onLoadMore]);

  const renderNewsItem: ListRenderItem<NewsItem> = ({ item, index }) => (
    <Pressable
      style={({ pressed }) => [styles.newsCard, pressed && styles.newsCardPressed]}
      onPress={() => onOpenNews(item)}
      accessibilityRole="button"
    >
      {hasRealNewsImage(item.imageUrl) && !failedImageUris.has(item.imageUrl) ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.newsImage}
          onError={() => {
            setFailedImageUris((current) => new Set(current).add(item.imageUrl));
          }}
        />
      ) : null}
      <View style={styles.newsBody}>
        <View style={styles.newsMetaRow}>
          <Text style={styles.newsSource} numberOfLines={1}>{item.source || '来源未返回'}</Text>
          <Text style={styles.newsDate}>{item.date}</Text>
        </View>
        <Text style={styles.newsTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.newsSummary} numberOfLines={3}>
          {item.summary || '摘要未返回'}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.categoryTag}>{item.category || '分类未返回'}</Text>
          <View style={styles.openHint}>
            <Text style={styles.openHintText}>{String(index + 1).padStart(2, '0')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primaryDark} />
          </View>
        </View>
      </View>
    </Pressable>
  );

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
          {imageNews.length > 0 ? (
            <View style={styles.carouselShell}>
              <ScrollView
                ref={carouselScrollRef}
                horizontal
                pagingEnabled
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleCarouselMomentumEnd}
                scrollEventThrottle={16}
              >
                {imageNews.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.carouselPanel,
                      { width: carouselWidth },
                      pressed ? styles.newsCardPressed : null,
                    ]}
                    onPress={() => onOpenNews(item)}
                    accessibilityRole="button"
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.carouselImage}
                      onError={() => {
                        setFailedImageUris((current) => new Set(current).add(item.imageUrl));
                      }}
                    />
                    <View style={styles.carouselOverlay}>
                      <View style={styles.carouselMetaRow}>
                        <Text style={styles.carouselSource} numberOfLines={1}>
                          {item.source}
                        </Text>
                        <Text style={styles.carouselDate}>{item.date}</Text>
                      </View>
                      <Text style={styles.carouselTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>

              {imageNews.length > 1 ? (
                <View style={styles.carouselDots}>
                  {imageNews.map((item, index) => (
                    <Pressable
                      key={item.id}
                      style={[styles.carouselDot, index === activeSlideIndex && styles.carouselDotActive]}
                      onPress={() => scrollToSlide(index)}
                      accessibilityRole="button"
                      accessibilityLabel={`切换到第 ${index + 1} 张新闻图片`}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          <View style={styles.monitorStrip}>
            {monitorMetrics.map((metric) => (
              <View key={metric.label} style={styles.monitorMetric}>
                <Text style={styles.monitorMetricValue}>{metric.value}</Text>
                <Text style={styles.monitorMetricLabel}>{metric.label}</Text>
              </View>
            ))}
            <Pressable
              style={({ pressed }) => [styles.refreshStatus, pressed && styles.newsCardPressed]}
              onPress={onRefresh}
              accessibilityRole="button"
            >
              <Animated.View
                style={[
                  styles.refreshStatusIcon,
                  isRefreshing ? { transform: [{ rotate: refreshRotate }] } : null,
                ]}
              >
                <Ionicons name="sync" size={13} color={colors.primaryDark} />
              </Animated.View>
              <Text style={styles.refreshStatusText}>{refreshText}</Text>
            </Pressable>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={22} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="输入棉花、海关、行情关键词"
              placeholderTextColor="#8a979f"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listHeaderText}>行业新闻</Text>

            </View>
            <View style={styles.listHeaderBadge}>
              <Ionicons name="newspaper-outline" size={13} color={colors.muted} />
              <Text style={styles.listHeaderMeta}>{isRefreshing ? '同步中' : '资讯'}</Text>
            </View>
          </View>
        </>
      }
      ListEmptyComponent={
        <EmptyState title="正在同步棉花资讯" text="本地暂无缓存，正在同步棉花、海关与行业资讯。" />
      }
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
  carouselShell: {
    height: 206,
    borderRadius: spacing.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.ink,
    overflow: 'hidden',
    ...shadow,
  },
  carouselPanel: {
    height: 206,
    backgroundColor: colors.ink,
  },
  carouselImage: {
    width: '100%',
    height: 206,
    resizeMode: 'cover',
  },
  carouselOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    padding: 14,
    paddingBottom: 36,
    backgroundColor: 'rgba(12, 24, 28, 0.36)',
  },
  carouselMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  carouselSource: {
    flex: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  carouselDate: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    fontWeight: '800',
  },
  carouselTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
    marginTop: 8,
  },
  carouselDots: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  carouselDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: '#ffffff',
  },
  monitorStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 12,
  },
  monitorMetric: {
    flex: 1,
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  monitorMetricValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },
  monitorMetricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  refreshStatus: {
    minWidth: 82,
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  refreshStatusIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceStrong,
    marginBottom: 3,
  },
  refreshStatusText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
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
    fontSize: 16,
    fontWeight: '900',
  },

  listHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  listHeaderMeta: {
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
  newsImage: {
    width: '100%',
    height: 142,
    resizeMode: 'cover',
    backgroundColor: '#dce5ea',
  },

  newsBody: {
    padding: 12,
  },
  newsMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 10,
  },
  newsSource: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
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
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  categoryTag: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '900',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  openHintText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
  },
  footerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 18,
  },
});
