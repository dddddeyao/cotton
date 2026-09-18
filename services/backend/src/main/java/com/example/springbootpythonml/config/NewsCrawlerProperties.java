package com.example.springbootpythonml.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "app.news.crawler")
public class NewsCrawlerProperties {

    private boolean enabled = false;
    private long initialDelayMs = 60000;
    private long fixedDelayMs = 86400000;
    private int maxItemsPerSource = 5;
    private int maxItemsPerRefresh = 5;
    private int maxItemsPerDay = 5;
    private int maxStoredItems = 100;
    private int minStoredItems = 50;
    private double minChineseRatio = 0.75;
    private int requestTimeoutMs = 12000;
    private boolean requireImage = false;
    private boolean fetchArticleContent = true;
    private boolean downloadImages = true;
    private String imageDirectory = "news";
    private List<String> includeKeywords = new ArrayList<>(List.of(
            "棉花", "原棉", "皮棉", "籽棉", "进口棉", "新疆棉", "疆棉", "郑棉", "美棉", "棉价", "棉市", "棉纱", "棉纺", "棉农", "棉企", "纺企", "纺织",
            "棉花检验", "纤维检验", "HVI", "颜色级", "叶屑", "cotton",
            "海关", "检测", "识别", "图像识别", "质量检测", "质量", "纤维", "检验", "分级", "进口", "出口"));
    private List<String> rejectKeywords = new ArrayList<>(List.of(
            "娱乐", "体育", "彩票", "游戏", "汽车", "房产", "招聘", "广告", "优惠券", "大宗商品涨跌榜", "商品报价动态", "生意社期货通", "生意社股票通"));
    private List<Source> sources = new ArrayList<>();

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public long getInitialDelayMs() { return initialDelayMs; }
    public void setInitialDelayMs(long initialDelayMs) { this.initialDelayMs = initialDelayMs; }

    public long getFixedDelayMs() { return fixedDelayMs; }
    public void setFixedDelayMs(long fixedDelayMs) { this.fixedDelayMs = fixedDelayMs; }

    public int getMaxItemsPerSource() { return maxItemsPerSource; }
    public void setMaxItemsPerSource(int maxItemsPerSource) { this.maxItemsPerSource = maxItemsPerSource; }

    public int getMaxItemsPerRefresh() { return maxItemsPerRefresh; }
    public void setMaxItemsPerRefresh(int maxItemsPerRefresh) { this.maxItemsPerRefresh = maxItemsPerRefresh; }

    public int getMaxItemsPerDay() { return maxItemsPerDay; }
    public void setMaxItemsPerDay(int maxItemsPerDay) { this.maxItemsPerDay = maxItemsPerDay; }

    public int getMaxStoredItems() { return maxStoredItems; }
    public void setMaxStoredItems(int maxStoredItems) { this.maxStoredItems = maxStoredItems; }

    public int getMinStoredItems() { return minStoredItems; }
    public void setMinStoredItems(int minStoredItems) { this.minStoredItems = minStoredItems; }

    public double getMinChineseRatio() { return minChineseRatio; }
    public void setMinChineseRatio(double minChineseRatio) { this.minChineseRatio = minChineseRatio; }

    public int getRequestTimeoutMs() { return requestTimeoutMs; }
    public void setRequestTimeoutMs(int requestTimeoutMs) { this.requestTimeoutMs = requestTimeoutMs; }

    public boolean isRequireImage() { return requireImage; }
    public void setRequireImage(boolean requireImage) { this.requireImage = requireImage; }

    public boolean isFetchArticleContent() { return fetchArticleContent; }
    public void setFetchArticleContent(boolean fetchArticleContent) { this.fetchArticleContent = fetchArticleContent; }

    public boolean isDownloadImages() { return downloadImages; }
    public void setDownloadImages(boolean downloadImages) { this.downloadImages = downloadImages; }

    public String getImageDirectory() { return imageDirectory; }
    public void setImageDirectory(String imageDirectory) { this.imageDirectory = imageDirectory; }

    public List<String> getIncludeKeywords() { return includeKeywords; }
    public void setIncludeKeywords(List<String> includeKeywords) { this.includeKeywords = includeKeywords; }

    public List<String> getRejectKeywords() { return rejectKeywords; }
    public void setRejectKeywords(List<String> rejectKeywords) { this.rejectKeywords = rejectKeywords; }

    public List<Source> getSources() { return sources; }
    public void setSources(List<Source> sources) { this.sources = sources; }

    public static class Source {
        private boolean enabled = true;
        private String name;
        private String url;
        private String type = "rss";
        private String language = "zh";
        private String category = "";
        private String urlPattern;
        private String contentSelector;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getUrlPattern() { return urlPattern; }
        public void setUrlPattern(String urlPattern) { this.urlPattern = urlPattern; }

        public String getContentSelector() { return contentSelector; }
        public void setContentSelector(String contentSelector) { this.contentSelector = contentSelector; }
    }
}