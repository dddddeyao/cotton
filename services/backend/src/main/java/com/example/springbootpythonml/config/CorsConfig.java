package com.example.springbootpythonml.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration  // 表示这是一个配置类
public class CorsConfig {

    @Value("${app.cors.allowed-origins:*}")
    private String allowedOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                String[] originPatterns = allowedOrigins.split("\\s*,\\s*");

                registry.addMapping("/**")  // 允许所有路径
                        .allowedOriginPatterns(originPatterns)  // 支持通过环境变量限制公网来源
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")  // 允许所有请求头
                        .allowCredentials(true)  // 允许携带 cookie
                        .maxAge(3600);
            }
        };
    }
}
