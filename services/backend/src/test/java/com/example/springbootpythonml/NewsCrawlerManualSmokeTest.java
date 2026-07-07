package com.example.springbootpythonml;

import com.example.springbootpythonml.entity.News;
import com.example.springbootpythonml.repository.NewsRepository;
import com.example.springbootpythonml.service.NewsCrawlerService;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "app.news.crawler.max-items-per-source=10",
        "app.news.crawler.max-items-per-refresh=10",
        "app.news.crawler.max-items-per-day=10",
        "app.news.crawler.max-stored-items=100",
        "app.news.crawler.min-stored-items=50",
        "app.news.crawler.min-chinese-ratio=0.75",
        "app.news.crawler.request-timeout-ms=20000",
        "app.news.crawler.require-image=false",
        "app.news.crawler.fetch-article-content=true",
        "app.news.crawler.download-images=true",
        "app.news.crawler.image-directory=news"
})
@ActiveProfiles("test")
class NewsCrawlerManualSmokeTest {

    @Autowired
    private NewsCrawlerService newsCrawlerService;

    @Autowired
    private NewsRepository newsRepository;

    @Value("${app.upload-dir}")
    private String uploadDir;

    @Test
    void fetchesChineseImageBackedCottonItems() {
        Assumptions.assumeTrue(Boolean.getBoolean("newsCrawlerSmoke"),
                "Run manually with -DnewsCrawlerSmoke=true when network access is expected.");

        int changed = newsCrawlerService.refreshAllSources();
        List<News> items = newsRepository.findAll().stream()
                .sorted(Comparator.comparing(News::getId))
                .toList();

        assertThat(changed).isGreaterThanOrEqualTo(10);
        assertThat(items).hasSizeGreaterThanOrEqualTo(10);
        assertThat(items).allSatisfy(news -> {
            assertThat(news.getTitle()).isNotBlank();
            assertThat(news.getSummary()).isNotBlank();
            assertThat(news.getContent()).isNotBlank();
            assertThat(news.getSourceUrl()).isNotBlank();
            if (!news.getImageUrl().isBlank()) {
                assertThat(news.getImageUrl()).startsWith("/uploads/news/");
                assertThat(localImagePath(news)).exists().isRegularFile();
            }
            assertThat(news.getLanguage()).isEqualTo("zh");
            assertThat(news.getTitle() + news.getSummary() + news.getContent()).containsPattern("[\\u4e00-\\u9fff]");
            assertThat(news.getKeywords()).containsPattern("棉花|棉|原棉|皮棉|籽棉|进口棉|新疆棉|疆棉|郑棉|美棉|棉价|棉市|棉纱|棉纺|棉农|棉企|纺企|纺织|cotton");
        });

        items.forEach(news -> System.out.printf("CRAWLED_NEWS|%d|lang=%s|content=%d|%s|%s|%s|%s|%s%n",
                news.getId(), news.getLanguage(), news.getContent().length(), compact(news.getTitle()), news.getSource(),
                news.getSourceUrl(), news.getImageUrl(), news.getKeywords()));
    }

    private Path localImagePath(News news) {
        String fileName = news.getImageUrl().substring("/uploads/news/".length());
        return Paths.get(uploadDir).toAbsolutePath().normalize().resolve("news").resolve(fileName).normalize();
    }

    private String compact(String value) {
        return value == null ? "" : value.replaceAll("\\s+", " ").replace("|", "/").trim();
    }
}