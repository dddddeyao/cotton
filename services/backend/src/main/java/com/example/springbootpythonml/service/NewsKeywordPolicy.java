package com.example.springbootpythonml.service;

import com.example.springbootpythonml.entity.News;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class NewsKeywordPolicy {

    private static final LocalDate MIN_PUBLISH_DATE = LocalDate.of(2026, 1, 1);
    private static final Pattern DATE_WITH_SEPARATORS = Pattern.compile(
            "(20\\d{2})[-/.年](\\d{1,2})[-/.月](\\d{1,2})(?:日)?");
    private static final Pattern COMPACT_DATE = Pattern.compile("(?<!\\d)(20\\d{2})(\\d{2})(\\d{2})(?!\\d)");
    private static final Pattern YEAR_ONLY = Pattern.compile("(?<!\\d)(20\\d{2})(?!\\d)");

    private static final List<String> COTTON_KEYWORDS = List.of(
            "棉花", "进口棉", "原棉", "皮棉", "籽棉", "新疆棉", "疆棉", "郑棉", "美棉",
            "棉价", "棉市", "棉纱", "棉纺", "棉企", "棉农", "棉花检验", "纤维检验",
            "cotton", "raw cotton", "cotton yarn");

    private static final List<String> CUSTOMS_KEYWORDS = List.of(
            "海关", "海关总署", "海关统计", "海关数据", "进出口", "进出口数据",
            "进口量", "出口量", "进口额", "出口额", "通关", "报关", "口岸", "查验", "检验检疫",
            "关税", "配额", "滑准税", "customs", "customs duty", "import duty", "export duty", "tariff", "quota");

    private static final List<String> REJECT_KEYWORDS = List.of(
            "娱乐", "体育", "彩票", "游戏", "汽车", "房产", "招聘", "广告", "优惠券",
            "登录 用户登录", "请输入用户名和密码", "大宗商品涨跌榜", "商品报价动态", "生意社期货通", "生意社股票通");

    private NewsKeywordPolicy() {
    }

    public static boolean isDisplayable(News news) {
        if (news == null) {
            return false;
        }

        String text = newsText(news);
        return hasRequiredKeywords(text)
                && !hasRejectSignal(text)
                && isPublishedInScope(news.getDate(), news.getSourceUrl(), news.getCrawledAt(), news.getCreatedAt());
    }

    public static boolean hasRequiredKeywords(String text) {
        String normalized = normalize(text);
        return containsAny(normalized, COTTON_KEYWORDS) && containsAny(normalized, CUSTOMS_KEYWORDS);
    }

    public static boolean hasCottonSignal(String text) {
        return containsAny(normalize(text), COTTON_KEYWORDS);
    }

    public static boolean hasCustomsSignal(String text) {
        return containsAny(normalize(text), CUSTOMS_KEYWORDS);
    }

    public static boolean hasRejectSignal(String text) {
        return containsAny(normalize(text), REJECT_KEYWORDS);
    }

    public static boolean isPublishedInScope(String date, String sourceUrl) {
        return publishDate(date, sourceUrl, null, null)
                .map(publishedAt -> !publishedAt.isBefore(MIN_PUBLISH_DATE))
                .orElse(false);
    }

    public static boolean isPublishedInScope(String date, String sourceUrl, LocalDateTime crawledAt, LocalDateTime createdAt) {
        return publishDate(date, sourceUrl, crawledAt, createdAt)
                .map(publishedAt -> !publishedAt.isBefore(MIN_PUBLISH_DATE))
                .orElse(false);
    }

    public static List<String> keywordVocabulary(List<String> configuredKeywords) {
        LinkedHashSet<String> keywords = new LinkedHashSet<>();
        keywords.addAll(COTTON_KEYWORDS);
        keywords.addAll(CUSTOMS_KEYWORDS);
        if (configuredKeywords != null) {
            configuredKeywords.stream()
                    .filter(keyword -> !isBlank(keyword))
                    .forEach(keywords::add);
        }
        return new ArrayList<>(keywords);
    }

    private static Optional<LocalDate> publishDate(
            String date,
            String sourceUrl,
            LocalDateTime crawledAt,
            LocalDateTime createdAt) {
        Optional<LocalDate> explicitDate = firstDate(date, sourceUrl);
        if (explicitDate.isPresent()) {
            return explicitDate;
        }

        // Fallback only when the stored record has no source date. This keeps old records out while allowing
        // fresh crawler records from sources that omit dates but are fetched during the target window.
        if (crawledAt != null) {
            return Optional.of(crawledAt.toLocalDate());
        }
        if (createdAt != null) {
            return Optional.of(createdAt.toLocalDate());
        }
        return Optional.empty();
    }

    private static Optional<LocalDate> firstDate(String... values) {
        for (String value : values) {
            Optional<LocalDate> parsed = parseDate(value);
            if (parsed.isPresent()) {
                return parsed;
            }
        }
        return Optional.empty();
    }

    private static Optional<LocalDate> parseDate(String value) {
        if (isBlank(value)) {
            return Optional.empty();
        }

        String normalized = value.trim();
        for (String candidate : List.of(normalized, normalized.replace('.', '-').replace('/', '-'))) {
            try {
                return Optional.of(LocalDate.parse(candidate, DateTimeFormatter.ISO_LOCAL_DATE));
            } catch (DateTimeParseException ignored) {
                // Continue with regex parsing.
            }
        }

        Matcher separated = DATE_WITH_SEPARATORS.matcher(normalized);
        if (separated.find()) {
            return dateFromParts(separated.group(1), separated.group(2), separated.group(3));
        }

        Matcher compact = COMPACT_DATE.matcher(normalized);
        while (compact.find()) {
            Optional<LocalDate> parsed = dateFromParts(compact.group(1), compact.group(2), compact.group(3));
            if (parsed.isPresent()) {
                return parsed;
            }
        }

        Matcher yearOnly = YEAR_ONLY.matcher(normalized);
        if (yearOnly.find()) {
            return dateFromParts(yearOnly.group(1), "1", "1");
        }
        return Optional.empty();
    }

    private static Optional<LocalDate> dateFromParts(String year, String month, String day) {
        try {
            return Optional.of(LocalDate.of(Integer.parseInt(year), Integer.parseInt(month), Integer.parseInt(day)));
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    private static String newsText(News news) {
        return String.join(" ",
                blankToEmpty(news.getTitle()),
                blankToEmpty(news.getSummary()),
                blankToEmpty(news.getContent()),
                blankToEmpty(news.getCategory()),
                blankToEmpty(news.getKeywords()));
    }

    private static boolean containsAny(String normalizedText, List<String> keywords) {
        return keywords.stream()
                .filter(keyword -> !isBlank(keyword))
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .anyMatch(normalizedText::contains);
    }

    private static String normalize(String value) {
        return blankToEmpty(value).toLowerCase(Locale.ROOT);
    }

    private static String blankToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
