package com.example.springbootpythonml.service;

import com.example.springbootpythonml.config.NewsCrawlerProperties;
import com.example.springbootpythonml.entity.News;
import com.example.springbootpythonml.repository.NewsRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.StringReader;
import java.net.URI;
import java.nio.ByteBuffer;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class NewsCrawlerService {

    private static final Logger log = LoggerFactory.getLogger(NewsCrawlerService.class);
    private static final Pattern META_TAG_PATTERN = Pattern.compile("<meta\\b[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern IMG_SRC_PATTERN = Pattern.compile("<img[^>]+src=[\\\"']([^\\\"']+)[\\\"']", Pattern.CASE_INSENSITIVE);
    private static final Pattern ANCHOR_PATTERN = Pattern.compile("(?is)<a\\s+[^>]*href=[\\\"']([^\\\"']+)[\\\"'][^>]*>(.*?)</a>");
    private static final Pattern ARTICLE_ID_PATTERN = Pattern.compile("(?is)<(?:article|div)\\b[^>]*id\\s*=\\s*([\\\"'])zhengwen\\1[^>]*>");
    private static final Pattern ARTICLE_CLASS_PATTERN = Pattern.compile(
            "(?is)<(?:article|div)\\b[^>]*class\\s*=\\s*([\\\"'])(?=[^\\\"']*(?:entry-content|post-content|article-content|article__body|content-body|article-body|TRS_Editor|detail-content|detail_content|detail-con|detail_con|main-content|main_content|articleText|article-text|article_text|txt|text))[^\\\"']*\\1[^>]*>");
    private static final Pattern ARTICLE_TAG_PATTERN = Pattern.compile("(?is)<article\\b[^>]*>");
    private static final Pattern PARAGRAPH_PATTERN = Pattern.compile("(?is)<p\\b[^>]*>(.*?)</p>");
    private static final Pattern CHARSET_PATTERN = Pattern.compile("(?i)charset\\s*=\\s*['\"]?([A-Za-z0-9._-]+)");
    private static final int MAX_CONTENT_LENGTH = 6000;
    private static final int MAX_SUMMARY_LENGTH = 220;
    private static final int MAX_ARTICLE_HTML_SCAN_LENGTH = 150000;
    private static final List<String> COTTON_SIGNAL_KEYWORDS = List.of(
            "棉花", "棉", "原棉", "皮棉", "籽棉", "进口棉", "新疆棉", "疆棉", "郑棉", "美棉",
            "棉价", "棉市", "棉纱", "棉纺", "棉农", "棉企", "纺企", "纺织",
            "棉花检验", "纤维检验", "cotton");
    private static final List<String> NON_DISPLAY_NEWS_IMAGE_MARKERS = List.of(
            "placeholder", "default", "news-default", "no-image", "cotton-news-placeholder",
            "/logo.", "/logo_", "/images_new/logo", "/topimgs/", "/banner.", "banner.jpg", "banner.png");

    private final NewsRepository newsRepository;
    private final NewsCrawlerProperties properties;

    @Value("${app.upload-dir:uploads}")
    private String uploadDir;

    public NewsCrawlerService(NewsRepository newsRepository, NewsCrawlerProperties properties) {
        this.newsRepository = newsRepository;
        this.properties = properties;
    }

    @Scheduled(
            initialDelayString = "${app.news.crawler.initial-delay-ms:60000}",
            fixedDelayString = "${app.news.crawler.fixed-delay-ms:86400000}")
    public void refreshScheduled() {
        if (!properties.isEnabled()) {
            return;
        }

        try {
            int inserted = refreshAllSources();
            log.info("news crawler finished, insertedOrUpdated={}", inserted);
        } catch (RuntimeException e) {
            log.warn("news crawler failed: {}", e.getMessage());
        }
    }

    public int refreshAllSources() {
        int changed = 0;
        int dailyLimit = remainingDailyItemLimit();
        int refreshLimit = Math.min(Math.max(1, properties.getMaxItemsPerRefresh()), dailyLimit);
        if (refreshLimit <= 0) {
            log.info("skip news refresh because daily limit {} is already reached", properties.getMaxItemsPerDay());
            trimStoredNews();
            return 0;
        }

        List<NewsCrawlerProperties.Source> chineseSources = properties.getSources().stream()
                .filter(this::isEnabledSource)
                .filter(this::isChineseSource)
                .toList();
        List<NewsCrawlerProperties.Source> otherSources = properties.getSources().stream()
                .filter(this::isEnabledSource)
                .filter(source -> !isChineseSource(source))
                .toList();

        for (NewsCrawlerProperties.Source source : chineseSources) {
            if (changed >= refreshLimit) {
                break;
            }
            changed += fetchSourceSafely(source, refreshLimit - changed);
        }

        if (changed < refreshLimit && canFetchNonChineseSources()) {
            for (NewsCrawlerProperties.Source source : otherSources) {
                if (changed >= refreshLimit) {
                    break;
                }
                changed += fetchSourceSafely(source, refreshLimit - changed);
            }
        } else if (changed < refreshLimit && !otherSources.isEmpty()) {
            log.info("skip non-Chinese news sources until local Chinese inventory reaches {} items and {:.0f}% ratio",
                    properties.getMinStoredItems(), properties.getMinChineseRatio() * 100);
        }

        trimStoredNews();
        return changed;
    }

    private boolean isEnabledSource(NewsCrawlerProperties.Source source) {
        return source.isEnabled() && !isBlank(source.getUrl());
    }

    private int fetchSourceSafely(NewsCrawlerProperties.Source source, int remainingLimit) {
        if (remainingLimit <= 0) {
            return 0;
        }

        try {
            return fetchSource(source, remainingLimit);
        } catch (Exception e) {
            log.warn("skip news source {}, reason={}", source.getName(), e.getMessage());
            return 0;
        }
    }

    private int remainingDailyItemLimit() {
        int maxItemsPerDay = Math.max(1, properties.getMaxItemsPerDay());
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime startOfTomorrow = today.plusDays(1).atStartOfDay();
        long usedToday = newsRepository.countByCrawledAtBetween(startOfDay, startOfTomorrow);
        return (int) Math.max(0, maxItemsPerDay - Math.min(usedToday, Integer.MAX_VALUE));
    }

    private boolean canFetchNonChineseSources() {
        long total = newsRepository.countDisplayNews();
        if (total < Math.max(0, properties.getMinStoredItems())) {
            return false;
        }

        long chinese = newsRepository.countDisplayNewsByLanguage("zh");
        if (total == 0) {
            return false;
        }
        return (double) chinese / (double) total >= properties.getMinChineseRatio();
    }

    private void trimStoredNews() {
        int maxStoredItems = Math.max(1, properties.getMaxStoredItems());
        long total = newsRepository.count();
        int deleted = 0;

        while (total > maxStoredItems) {
            int deleteCount = (int) Math.min(total - maxStoredItems, 1000);
            List<News> oldestNews = newsRepository.findOldestNews(PageRequest.of(0, deleteCount)).getContent();
            if (oldestNews.isEmpty()) {
                break;
            }

            newsRepository.deleteAll(oldestNews);
            deleted += oldestNews.size();
            total -= oldestNews.size();
        }

        if (deleted > 0) {
            log.info("news retention trimmed old items, maxStored={}, deleted={}", maxStoredItems, deleted);
        }
    }
    private int fetchSource(NewsCrawlerProperties.Source source, int remainingLimit) throws Exception {
        if ("html".equalsIgnoreCase(source.getType())) {
            return fetchHtmlSource(source, remainingLimit);
        }
        return fetchRssSource(source, remainingLimit);
    }

    private int fetchRssSource(NewsCrawlerProperties.Source source, int remainingLimit) throws Exception {
        String xml = fetchText(source.getUrl());
        Document document = parseXml(xml);
        NodeList nodes = document.getElementsByTagName("item");
        if (nodes.getLength() == 0) {
            nodes = document.getElementsByTagName("entry");
        }

        int changed = 0;
        int skipped = 0;
        int limit = Math.min(nodes.getLength(), Math.min(Math.max(1, properties.getMaxItemsPerSource()), Math.max(0, remainingLimit)));
        for (int i = 0; i < limit; i++) {
            Node node = nodes.item(i);
            if (!(node instanceof Element item)) {
                skipped++;
                continue;
            }

            Optional<News> candidate = buildRssCandidate(source, item);
            if (candidate.isEmpty()) {
                skipped++;
                continue;
            }

            saveOrUpdate(candidate.get());
            changed++;
        }
        log.info("news source {} rss items={}, checked={}, saved={}, skipped={}",
                source.getName(), nodes.getLength(), limit, changed, skipped);
        return changed;
    }

    private int fetchHtmlSource(NewsCrawlerProperties.Source source, int remainingLimit) throws Exception {
        String html = fetchText(source.getUrl());
        List<LinkCandidate> links = extractHtmlLinks(source, html);
        int changed = 0;
        int skipped = 0;
        int limit = Math.min(links.size(), Math.min(Math.max(1, properties.getMaxItemsPerSource()), Math.max(0, remainingLimit)));
        for (int i = 0; i < limit; i++) {
            LinkCandidate link = links.get(i);
            Optional<News> candidate = buildHtmlCandidate(source, link);
            if (candidate.isEmpty()) {
                skipped++;
                continue;
            }

            saveOrUpdate(candidate.get());
            changed++;
        }
        log.info("news source {} html links={}, checked={}, saved={}, skipped={}",
                source.getName(), links.size(), limit, changed, skipped);
        return changed;
    }

    private String fetchText(String url) throws Exception {
        HttpResponse<byte[]> response = fetchBytes(url);
        String contentType = response.headers().firstValue("content-type").orElse("");
        return decodeText(response.body(), contentType);
    }

    private String decodeText(byte[] body, String contentType) {
        Charset charset = charsetFrom(contentType);
        if (charset == null) {
            String probe = new String(body, StandardCharsets.ISO_8859_1);
            charset = charsetFrom(probe);
        }
        if (charset == null) {
            charset = StandardCharsets.UTF_8;
        }
        return new String(body, charset);
    }

    private Charset charsetFrom(String value) {
        Matcher matcher = CHARSET_PATTERN.matcher(value == null ? "" : value);
        if (!matcher.find()) {
            return null;
        }
        try {
            return Charset.forName(matcher.group(1));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private HttpResponse<byte[]> fetchBytes(String url) throws Exception {
        HttpResponse<byte[]> response = httpClient().send(requestBuilder(url).GET().build(), HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IllegalStateException("HTTP " + response.statusCode());
        }
        return response;
    }

    private HttpClient httpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(properties.getRequestTimeoutMs()))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    private HttpRequest.Builder requestBuilder(String url) {
        return HttpRequest.newBuilder(toRequestUri(url))
                .timeout(Duration.ofMillis(properties.getRequestTimeoutMs()))
                .header("User-Agent", "CottonRecognitionAssistant/1.0 (+news aggregation; contact administrator)");
    }

    private URI toRequestUri(String url) {
        try {
            return URI.create(url);
        } catch (IllegalArgumentException ignored) {
            return URI.create(encodeIllegalUriChars(url));
        }
    }

    private String encodeIllegalUriChars(String value) {
        StringBuilder builder = new StringBuilder();
        for (int offset = 0; offset < value.length(); ) {
            int codePoint = value.codePointAt(offset);
            offset += Character.charCount(codePoint);
            if (isAllowedUriCodePoint(codePoint)) {
                builder.appendCodePoint(codePoint);
                continue;
            }

            ByteBuffer bytes = StandardCharsets.UTF_8.encode(new String(Character.toChars(codePoint)));
            while (bytes.hasRemaining()) {
                builder.append('%');
                builder.append(String.format(Locale.ROOT, "%02X", bytes.get() & 0xff));
            }
        }
        return builder.toString();
    }

    private boolean isAllowedUriCodePoint(int codePoint) {
        if ((codePoint >= 'a' && codePoint <= 'z')
                || (codePoint >= 'A' && codePoint <= 'Z')
                || (codePoint >= '0' && codePoint <= '9')) {
            return true;
        }
        return "-._~:/?#[]@!$&'()*+,;=%".indexOf(codePoint) >= 0;
    }

    private Document parseXml(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setExpandEntityReferences(false);
        setFeature(factory, "http://apache.org/xml/features/disallow-doctype-decl", true);
        setFeature(factory, "http://xml.org/sax/features/external-general-entities", false);
        setFeature(factory, "http://xml.org/sax/features/external-parameter-entities", false);
        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(new InputSource(new StringReader(xml)));
    }

    private void setFeature(DocumentBuilderFactory factory, String feature, boolean value) {
        try {
            factory.setFeature(feature, value);
        } catch (Exception ignored) {
            // Some parsers do not support every hardening flag.
        }
    }

    private Optional<News> buildRssCandidate(NewsCrawlerProperties.Source source, Element item) {
        String title = cleanText(firstText(item, "title"));
        String link = firstLink(item, source.getUrl());
        String rawDescription = firstText(item, "description", "summary", "content", "encoded");
        String content = truncate(cleanText(rawDescription), MAX_CONTENT_LENGTH);
        String summary = truncate(content, MAX_SUMMARY_LENGTH);
        String imageUrl = resolveUrl(extractFeedImageUrl(item, rawDescription), source.getUrl());
        String date = cleanText(firstText(item, "pubDate", "published", "updated", "date"));

        if (isBlank(title) || isBlank(link) || isBlank(summary)) {
            return Optional.empty();
        }

        String feedHaystack = title + " " + summary + " " + content;
        if (!passesStrictFilter(feedHaystack)) {
            return Optional.empty();
        }

        String articleHtml = "";
        if (properties.isFetchArticleContent() || isBlank(imageUrl)) {
            articleHtml = fetchArticleHtml(link);
        }

        if (properties.isFetchArticleContent() && !isBlank(articleHtml)) {
            String articleContent = truncate(extractArticleContent(articleHtml), MAX_CONTENT_LENGTH);
            if (articleContent.length() > content.length()) {
                content = articleContent;
                summary = truncate(content, MAX_SUMMARY_LENGTH);
            }
        }

        if (isBlank(imageUrl) && !isBlank(articleHtml)) {
            String block = extractArticleBlock(articleHtml);
            imageUrl = resolveUrl(firstNonBlank(extractArticleImageUrl(block), extractMetaImageUrl(articleHtml)), link);
        }

        return toNews(source, title, summary, content, date, link, imageUrl);
    }

    private Optional<News> buildHtmlCandidate(NewsCrawlerProperties.Source source, LinkCandidate linkCandidate) {
        String articleHtml = fetchArticleHtml(linkCandidate.url());
        if (isBlank(articleHtml)) {
            return Optional.empty();
        }

        String title = firstNonBlank(extractHtmlTitle(articleHtml), linkCandidate.title());
        String date = extractHtmlDate(articleHtml, linkCandidate.url());
        String articleBlock = extractArticleBlock(articleHtml);
        String content = truncate(extractArticleContent(articleHtml), MAX_CONTENT_LENGTH);
        String summary = truncate(content, MAX_SUMMARY_LENGTH);
        String imageUrl = resolveUrl(firstNonBlank(extractArticleImageUrl(articleBlock), extractMetaImageUrl(articleHtml)), linkCandidate.url());

        if (isBlank(title) || isBlank(summary)) {
            return Optional.empty();
        }

        String haystack = title + " " + summary + " " + content;
        if (!passesStrictFilter(haystack)) {
            return Optional.empty();
        }

        return toNews(source, title, summary, content, date, linkCandidate.url(), imageUrl);
    }

    private Optional<News> toNews(NewsCrawlerProperties.Source source, String title, String summary, String content,
                                  String date, String link, String imageUrl) {
        String localImageUrl = localizeImageUrl(imageUrl, link);
        if (properties.isRequireImage() && isBlank(localImageUrl)) {
            return Optional.empty();
        }

        String language = normalizedLanguage(source.getLanguage(), title + " " + summary + " " + content);
        String haystack = title + " " + summary + " " + content;
        News news = new News();
        news.setTitle(title);
        news.setSummary(summary);
        news.setContent(content);
        news.setDate(date);
        news.setSource(isBlank(source.getName()) ? hostOf(source.getUrl()) : source.getName());
        news.setSourceUrl(link);
        news.setImageUrl(localImageUrl);
        news.setCategory(isBlank(source.getCategory()) ? "" : source.getCategory());
        news.setLanguage(language);
        news.setKeywords(matchedKeywords(haystack));
        news.setCrawledAt(LocalDateTime.now());
        return Optional.of(news);
    }

    private String normalizedLanguage(String configured, String text) {
        if (!isBlank(configured)) {
            return configured.toLowerCase(Locale.ROOT).startsWith("zh") ? "zh" : configured.toLowerCase(Locale.ROOT);
        }
        return containsChinese(text) ? "zh" : "en";
    }

    private boolean isChineseSource(NewsCrawlerProperties.Source source) {
        return normalizedLanguage(source.getLanguage(), source.getName()).equals("zh");
    }

    private boolean containsChinese(String value) {
        return Pattern.compile("[\\u4e00-\\u9fff]").matcher(value == null ? "" : value).find();
    }

    private String fetchArticleHtml(String articleUrl) {
        if (isBlank(articleUrl)) {
            return "";
        }

        try {
            return fetchText(articleUrl);
        } catch (Exception e) {
            log.debug("skip article html {}, reason={}", articleUrl, e.getMessage());
            return "";
        }
    }

    private void saveOrUpdate(News candidate) {
        News news = newsRepository.findBySourceUrl(candidate.getSourceUrl()).orElseGet(News::new);
        news.setTitle(candidate.getTitle());
        news.setSummary(candidate.getSummary());
        news.setContent(candidate.getContent());
        news.setDate(candidate.getDate());
        news.setSource(candidate.getSource());
        news.setSourceUrl(candidate.getSourceUrl());
        news.setImageUrl(isBlank(candidate.getImageUrl()) ? "" : candidate.getImageUrl());
        news.setCategory(candidate.getCategory());
        news.setLanguage(candidate.getLanguage());
        news.setKeywords(candidate.getKeywords());
        news.setCrawledAt(candidate.getCrawledAt());
        newsRepository.save(news);
    }

    private boolean passesStrictFilter(String text) {
        String normalized = text.toLowerCase(Locale.ROOT);
        if (!containsAnyKeyword(normalized, COTTON_SIGNAL_KEYWORDS)) {
            return false;
        }

        boolean included = containsAnyKeyword(normalized, properties.getIncludeKeywords());
        if (!included) {
            return false;
        }

        return properties.getRejectKeywords().stream()
                .filter(keyword -> !isBlank(keyword))
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .noneMatch(normalized::contains);
    }

    private boolean containsAnyKeyword(String normalizedText, List<String> keywords) {
        return keywords.stream()
                .filter(keyword -> !isBlank(keyword))
                .map(keyword -> keyword.toLowerCase(Locale.ROOT))
                .anyMatch(normalizedText::contains);
    }

    private String matchedKeywords(String text) {
        String normalized = text.toLowerCase(Locale.ROOT);
        List<String> hits = new ArrayList<>();
        for (String keyword : properties.getIncludeKeywords()) {
            if (!isBlank(keyword) && normalized.contains(keyword.toLowerCase(Locale.ROOT))) {
                hits.add(keyword);
            }
        }
        return String.join(",", hits);
    }

    private List<LinkCandidate> extractHtmlLinks(NewsCrawlerProperties.Source source, String html) {
        Map<String, LinkCandidate> links = new LinkedHashMap<>();
        Pattern urlPattern = isBlank(source.getUrlPattern()) ? null : Pattern.compile(source.getUrlPattern());
        Matcher matcher = ANCHOR_PATTERN.matcher(html == null ? "" : html);
        while (matcher.find()) {
            String href = matcher.group(1);
            String title = cleanText(matcher.group(2));
            String url = resolveUrl(href, source.getUrl());
            if (isBlank(url)) {
                continue;
            }
            if (urlPattern != null && !urlPattern.matcher(url).find()) {
                continue;
            }
            if (urlPattern == null && !url.contains("news_show")) {
                continue;
            }
            links.putIfAbsent(url, new LinkCandidate(title, url));
        }
        return new ArrayList<>(links.values());
    }

    private String firstText(Element item, String... names) {
        for (String name : names) {
            for (Element child : childElements(item)) {
                if (localName(child).equalsIgnoreCase(name)) {
                    return child.getTextContent();
                }
            }
        }
        return "";
    }

    private String firstLink(Element item, String baseUrl) {
        for (Element child : childElements(item)) {
            if (!localName(child).equalsIgnoreCase("link")) {
                continue;
            }

            String href = child.getAttribute("href");
            if (!isBlank(href)) {
                return resolveUrl(href, baseUrl);
            }

            String text = cleanText(child.getTextContent());
            if (!isBlank(text)) {
                return resolveUrl(text, baseUrl);
            }
        }
        return "";
    }

    private String extractFeedImageUrl(Element item, String rawDescription) {
        for (Element child : childElements(item)) {
            String name = localName(child).toLowerCase(Locale.ROOT);
            String url = child.getAttribute("url");
            String type = child.getAttribute("type");
            if ((name.equals("content") || name.equals("thumbnail")) && !isBlank(url)) {
                return url;
            }
            if (name.equals("enclosure") && !isBlank(url) && type.toLowerCase(Locale.ROOT).startsWith("image/")) {
                return url;
            }
        }

        Matcher matcher = IMG_SRC_PATTERN.matcher(rawDescription == null ? "" : rawDescription);
        return matcher.find() ? matcher.group(1) : "";
    }

    private String extractMetaImageUrl(String html) {
        Matcher matcher = META_TAG_PATTERN.matcher(html == null ? "" : html);
        while (matcher.find()) {
            String tag = matcher.group();
            String property = attributeOf(tag, "property");
            String name = attributeOf(tag, "name");
            String key = isBlank(property) ? name : property;
            if (!isImageMetaKey(key)) {
                continue;
            }

            String content = attributeOf(tag, "content");
            if (!isBlank(content)) {
                return content;
            }
        }
        return "";
    }

    private boolean isImageMetaKey(String key) {
        if (isBlank(key)) {
            return false;
        }

        String normalized = key.toLowerCase(Locale.ROOT);
        return normalized.equals("og:image")
                || normalized.equals("og:image:url")
                || normalized.equals("twitter:image")
                || normalized.equals("twitter:image:src");
    }

    private String extractArticleImageUrl(String html) {
        Matcher matcher = IMG_SRC_PATTERN.matcher(html == null ? "" : html);
        return matcher.find() ? matcher.group(1) : "";
    }

    private String extractHtmlTitle(String html) {
        String title = firstRegexGroup(html, "(?is)<div\\b[^>]*class\\s*=\\s*([\\\"'])(?=[^\\\"']*\\bt\\b)[^\\\"']*\\1[^>]*>(.*?)</div>");
        if (!isBlank(title)) {
            return cleanText(title);
        }
        return cleanText(firstRegexGroup(html, "(?is)<title[^>]*>(.*?)</title>"));
    }

    private String extractHtmlDate(String html, String url) {
        String date = cleanText(firstRegexGroup(html, "(?is)<div\\b[^>]*class\\s*=\\s*([\\\"'])(?=[^\\\"']*news_date_text)[^\\\"']*\\1[^>]*>(.*?)</div>"));
        if (!isBlank(date)) {
            return date;
        }
        Matcher matcher = Pattern.compile("newstime=([0-9]{4}-[0-9]{2}-[0-9]{2})").matcher(url == null ? "" : url);
        return matcher.find() ? matcher.group(1) : "";
    }

    private String firstRegexGroup(String value, String regex) {
        Matcher matcher = Pattern.compile(regex).matcher(value == null ? "" : value);
        if (!matcher.find()) {
            return "";
        }
        return matcher.group(matcher.groupCount());
    }

    private String extractArticleContent(String html) {
        return extractArticleContent(null, html);
    }

    private String extractArticleContent(NewsCrawlerProperties.Source source, String html) {
        String block = source == null ? extractArticleBlock(html) : extractArticleBlock(source, html);
        if (isBlank(block)) {
            return "";
        }

        String paragraphs = extractParagraphText(block);
        if (!isBlank(paragraphs)) {
            return paragraphs;
        }
        return cleanText(block);
    }

    private String extractArticleBlock(NewsCrawlerProperties.Source source, String html) {
        if (source != null && !isBlank(source.getContentSelector())) {
            for (String selector : source.getContentSelector().split("\\|")) {
                String block = extractConfiguredBlock(html, selector.trim());
                if (!isBlank(block)) {
                    return block;
                }
            }
        }
        return extractArticleBlock(html);
    }

    private String extractConfiguredBlock(String html, String selector) {
        if (isBlank(html) || isBlank(selector)) {
            return "";
        }

        String token = selector.replaceFirst("^[#.]+", "");
        if (isBlank(token)) {
            return "";
        }

        String quoted = Pattern.quote(token);
        Pattern pattern;
        if (selector.startsWith("#")) {
            pattern = Pattern.compile("(?is)<(?:article|div|section|main)\\b[^>]*id\\s*=\\s*([\\\"'])" + quoted + "\\1[^>]*>");
        } else if (selector.startsWith(".")) {
            pattern = Pattern.compile("(?is)<(?:article|div|section|main)\\b[^>]*class\\s*=\\s*([\\\"'])(?=[^\\\"']*" + quoted + ")[^\\\"']*\\1[^>]*>");
        } else {
            pattern = Pattern.compile("(?is)<(?:article|div|section|main)\\b[^>]*(?:id|class)\\s*=\\s*([\\\"'])(?=[^\\\"']*" + quoted + ")[^\\\"']*\\1[^>]*>");
        }
        int start = startAfter(pattern, html);
        return start < 0 ? "" : articleSliceFrom(html, start);
    }
    private String extractArticleBlock(String html) {
        if (isBlank(html)) {
            return "";
        }

        int start = startAfter(ARTICLE_ID_PATTERN, html);
        if (start < 0) {
            start = startAfter(ARTICLE_CLASS_PATTERN, html);
        }
        if (start < 0) {
            start = startAfter(ARTICLE_TAG_PATTERN, html);
        }
        if (start < 0 || start >= html.length()) {
            return "";
        }

        return articleSliceFrom(html, start);
    }

    private String articleSliceFrom(String html, int start) {
        int end = Math.min(html.length(), start + MAX_ARTICLE_HTML_SCAN_LENGTH);
        for (String marker : List.of(
                "<div class=\"news_show news_source",
                "<div class='news_show news_source",
                "<div class=\"post-tags",
                "<div class=\"author",
                "<div class=\"related",
                "<section class=\"related",
                "<div id=\"comments",
                "<nav",
                "<footer",
                "</article>")) {
            int index = html.indexOf(marker, start);
            if (index > start && index < end) {
                end = index;
            }
        }
        return html.substring(start, end);
    }
    private int startAfter(Pattern pattern, String html) {
        Matcher matcher = pattern.matcher(html);
        return matcher.find() ? matcher.end() : -1;
    }

    private String extractParagraphText(String html) {
        List<String> paragraphs = new ArrayList<>();
        Matcher matcher = PARAGRAPH_PATTERN.matcher(html == null ? "" : html);
        while (matcher.find()) {
            String paragraph = cleanText(matcher.group(1));
            if (isMeaningfulParagraph(paragraph)) {
                paragraphs.add(paragraph);
            }
        }
        return String.join("\n\n", paragraphs);
    }

    private boolean isMeaningfulParagraph(String value) {
        if (isBlank(value) || value.length() < 20) {
            return false;
        }

        String normalized = value.toLowerCase(Locale.ROOT);
        return !(normalized.contains("the post ") && normalized.contains(" appeared first"))
                && !normalized.contains("all rights reserved")
                && !normalized.contains("严正声明")
                && !normalized.startsWith("点击")
                && !normalized.startsWith("click here")
                && !normalized.startsWith("read more");
    }

    private String localizeImageUrl(String imageUrl, String baseUrl) {
        String absoluteUrl = resolveUrl(imageUrl, baseUrl);
        if (isBlank(absoluteUrl)) {
            return "";
        }
        if (isNonDisplayNewsImageUrl(absoluteUrl)) {
            return "";
        }
        if (!properties.isDownloadImages()) {
            return absoluteUrl;
        }

        String normalizedUrl = absoluteUrl.toLowerCase(Locale.ROOT);
        if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
            return absoluteUrl;
        }

        try {
            HttpResponse<byte[]> response = fetchBytes(absoluteUrl);
            String contentType = response.headers().firstValue("content-type").orElse("").toLowerCase(Locale.ROOT);
            if (!contentType.startsWith("image/")) {
                return "";
            }

            byte[] body = response.body();
            if (body.length == 0) {
                return "";
            }

            String directoryName = safeImageDirectory();
            Path directory = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(directoryName).normalize();
            Files.createDirectories(directory);

            String filename = sha256(absoluteUrl) + extensionFrom(contentType, absoluteUrl);
            Path target = directory.resolve(filename).normalize();
            if (!target.startsWith(directory)) {
                throw new IllegalStateException("invalid image target path");
            }
            if (!Files.exists(target)) {
                Files.write(target, body);
            }
            return "/uploads/" + directoryName + "/" + filename;
        } catch (Exception e) {
            log.debug("skip local image {}, reason={}", absoluteUrl, e.getMessage());
            return "";
        }
    }
    private String safeImageDirectory() {
        String value = properties.getImageDirectory();
        if (isBlank(value)) {
            return "news";
        }

        String safe = value.trim().replaceAll("[^A-Za-z0-9_-]", "-");
        return isBlank(safe) ? "news" : safe;
    }

    private String sha256(String value) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(digest).substring(0, 32);
    }

    private String extensionFrom(String contentType, String imageUrl) {
        String normalized = contentType.toLowerCase(Locale.ROOT);
        if (normalized.contains("jpeg") || normalized.contains("jpg")) {
            return ".jpg";
        }
        if (normalized.contains("png")) {
            return ".png";
        }
        if (normalized.contains("webp")) {
            return ".webp";
        }
        if (normalized.contains("gif")) {
            return ".gif";
        }

        try {
            String path = URI.create(imageUrl).getPath();
            int dot = path.lastIndexOf('.');
            if (dot >= 0) {
                String ext = path.substring(dot).toLowerCase(Locale.ROOT);
                if (ext.matches("\\.[a-z0-9]{2,5}")) {
                    return ext;
                }
            }
        } catch (RuntimeException ignored) {
            // Fall back to jpg below.
        }
        return ".jpg";
    }

    private String attributeOf(String tag, String attributeName) {
        Pattern pattern = Pattern.compile("\\b" + Pattern.quote(attributeName) + "\\s*=\\s*([\\\"'])(.*?)\\1",
                Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(tag == null ? "" : tag);
        if (!matcher.find()) {
            return "";
        }
        return decodeEntities(matcher.group(2)).trim();
    }

    private List<Element> childElements(Element element) {
        List<Element> children = new ArrayList<>();
        NodeList nodeList = element.getChildNodes();
        for (int i = 0; i < nodeList.getLength(); i++) {
            Node child = nodeList.item(i);
            if (child instanceof Element childElement) {
                children.add(childElement);
            }
        }
        return children;
    }

    private String localName(Node node) {
        String localName = node.getLocalName();
        if (!isBlank(localName)) {
            return localName;
        }
        String nodeName = node.getNodeName();
        int colonIndex = nodeName.indexOf(':');
        return colonIndex >= 0 ? nodeName.substring(colonIndex + 1) : nodeName;
    }

    private String cleanText(String value) {
        if (value == null) {
            return "";
        }
        return decodeEntities(value
                .replaceAll("(?is)<script.*?</script>", " ")
                .replaceAll("(?is)<style.*?</style>", " ")
                .replaceAll("(?is)<noscript.*?</noscript>", " ")
                .replaceAll("(?is)<svg.*?</svg>", " ")
                .replaceAll("(?is)<button.*?</button>", " ")
                .replaceAll("(?is)<[^>]+>", " "))
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String decodeEntities(String value) {
        return value
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&ldquo;", "\"")
                .replace("&rdquo;", "\"")
                .replace("&lsquo;", "'")
                .replace("&rsquo;", "'")
                .replace("&mdash;", "-")
                .replace("&lt;", "<")
                .replace("&gt;", ">");
    }

    private String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value == null ? "" : value;
        }
        return value.substring(0, maxLength - 1) + "…";
    }

    private String resolveUrl(String value, String baseUrl) {
        if (isBlank(value)) {
            return "";
        }
        try {
            return toRequestUri(baseUrl).resolve(encodeIllegalUriChars(value.trim())).toString();
        } catch (RuntimeException e) {
            return encodeIllegalUriChars(value.trim());
        }
    }

    private String hostOf(String value) {
        try {
            return URI.create(value).getHost();
        } catch (RuntimeException e) {
            return "行业来源";
        }
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (!isBlank(value)) {
                return value;
            }
        }
        return "";
    }

    private boolean isNonDisplayNewsImageUrl(String imageUrl) {
        if (isBlank(imageUrl)) {
            return true;
        }

        String normalized = imageUrl.toLowerCase(Locale.ROOT);
        return NON_DISPLAY_NEWS_IMAGE_MARKERS.stream().anyMatch(normalized::contains);
    }
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record LinkCandidate(String title, String url) {}
}

