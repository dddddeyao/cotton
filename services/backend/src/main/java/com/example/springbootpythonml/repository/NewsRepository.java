package com.example.springbootpythonml.repository;

import com.example.springbootpythonml.entity.News;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NewsRepository extends JpaRepository<News, Long> {
    List<News> findAllByOrderByCreatedAtDesc();

    @Query("select n from News n order by coalesce(n.crawledAt, n.createdAt) desc, n.createdAt desc, n.id desc")
    Page<News> findDisplayNews(Pageable pageable);

    @Query("select count(n) from News n")
    long countDisplayNews();

    @Query("select count(n) from News n where n.language = :language")
    long countDisplayNewsByLanguage(@Param("language") String language);

    @Query("select n from News n order by coalesce(n.crawledAt, n.createdAt) asc, n.createdAt asc, n.id asc")
    Page<News> findOldestNews(Pageable pageable);

    long countByCrawledAtBetween(LocalDateTime startInclusive, LocalDateTime endExclusive);

    Optional<News> findBySourceUrl(String sourceUrl);

    boolean existsBySourceUrl(String sourceUrl);
}