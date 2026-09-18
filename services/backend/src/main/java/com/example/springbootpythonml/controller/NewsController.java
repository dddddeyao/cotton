package com.example.springbootpythonml.controller;

import com.example.springbootpythonml.dto.ApiResponse;
import com.example.springbootpythonml.dto.NewsPageResponse;
import com.example.springbootpythonml.entity.News;
import com.example.springbootpythonml.repository.NewsRepository;
import com.example.springbootpythonml.service.NewsKeywordPolicy;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

@RestController
@RequestMapping("/news")
public class NewsController {

    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 50;

    private final NewsRepository newsRepository;

    public NewsController(NewsRepository newsRepository) {
        this.newsRepository = newsRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<NewsPageResponse>> getNews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Long seed) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size <= 0 ? DEFAULT_PAGE_SIZE : size, MAX_PAGE_SIZE));
        List<News> shuffledNews = displayNews(seed);
        int fromIndex = Math.min(safePage * safeSize, shuffledNews.size());
        int toIndex = Math.min(fromIndex + safeSize, shuffledNews.size());
        List<News> pageItems = shuffledNews.subList(fromIndex, toIndex);
        NewsPageResponse response = new NewsPageResponse(
                pageItems,
                safePage,
                safeSize,
                shuffledNews.size(),
                toIndex < shuffledNews.size());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<News>> getNewsDetail(@PathVariable Long id) {
        return newsRepository.findById(id)
                .filter(NewsKeywordPolicy::isDisplayable)
                .map(news -> ResponseEntity.ok(ApiResponse.success(news)))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(ApiResponse.error(404, "新闻不存在")));
    }

    private List<News> displayNews(Long seed) {
        List<News> news = newsRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(NewsKeywordPolicy::isDisplayable)
                .toList();
        List<News> shuffledNews = new ArrayList<>(news);
        Collections.shuffle(shuffledNews, new Random(seed == null ? System.nanoTime() : seed));
        return shuffledNews;
    }
}
