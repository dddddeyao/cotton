package com.example.springbootpythonml.controller;

import com.example.springbootpythonml.dto.ApiResponse;
import com.example.springbootpythonml.entity.News;
import com.example.springbootpythonml.repository.NewsRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/news")
public class NewsController {

    private final NewsRepository newsRepository;

    public NewsController(NewsRepository newsRepository) {
        this.newsRepository = newsRepository;
    }

    @PostConstruct
    public void initMockNews() {
        if (newsRepository.count() == 0) {
            String[][] mockNews = {
                {"2025年棉花进口关税配额申请启动", "海关总署发布2025年棉花进口关税配额申请条件和程序，企业可于规定时间内提交申请。", "海关总署"},
                {"新疆棉花目标价格补贴政策优化", "国家进一步完善新疆棉花目标价格补贴政策，提高补贴精准度，保障棉农收益。", "农业农村部"},
                {"中国棉花协会发布行业景气报告", "报告显示2025年一季度我国棉花产业景气指数回升，市场信心逐步恢复。", "中国棉花协会"},
                {"国际棉价波动对出口贸易的影响分析", "受国际市场需求变化影响，近期棉价呈现震荡走势，出口企业需关注风险。", "经济参考报"},
                {"棉花数字化育种技术取得新突破", "中国农科院研发的新型棉花育种技术可大幅缩短育种周期，提高棉花品质。", "科技日报"},
                {"纺织行业数字化转型提速", "智能制造技术在棉纺织领域加速应用，推动行业降本增效、绿色发展。", "中国纺织报"},
                {"黄河流域棉花种植面积稳中有增", "今年黄河流域棉区种植面积小幅增长，棉花长势总体良好，丰收可期。", "农民日报"},
            };

            for (String[] item : mockNews) {
                News news = new News();
                news.setTitle(item[0]);
                news.setSummary(item[1]);
                news.setSource(item[2]);
                news.setDate("2025-" + String.format("%02d", (int)(Math.random() * 12) + 1)
                        + "-" + String.format("%02d", (int)(Math.random() * 28) + 1));
                newsRepository.save(news);
            }
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<News>>> getNews() {
        List<News> newsList = newsRepository.findAllByOrderByCreatedAtDesc();
        return ResponseEntity.ok(ApiResponse.success(newsList));
    }
}
