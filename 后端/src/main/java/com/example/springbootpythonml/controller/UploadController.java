package com.example.springbootpythonml.controller;

import com.example.springbootpythonml.dto.RecognitionResult;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.InputStreamResource;

import java.io.InputStream;
import java.io.IOException;

@RestController
@RequestMapping("/api/v1")
public class UploadController {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String flaskBase;

    public UploadController(@Value("${python.service.url}") String flaskBase) {
        this.flaskBase = flaskBase;
    }

    @PostMapping("/upload")
    public ResponseEntity<RecognitionResult> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "images", required = false, defaultValue = "0") String images // 默认不返回图片
    ) throws IOException {

        // 1) 组装 multipart 发给 Flask
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new MultipartInputStreamFileResource(
                file.getInputStream(), file.getOriginalFilename(), file.getSize()));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        headers.set("Accept-Encoding", "gzip"); // 以后需要大响应时，建议让 Flask 压缩

        HttpEntity<MultiValueMap<String, Object>> req = new HttpEntity<>(body, headers);
        String url = flaskBase + "/predict?images=" + images;

        // 2) 先拿 String（便于日志/容错）
        ResponseEntity<String> resp = restTemplate.postForEntity(url, req, String.class);
        String json = resp.getBody();
        System.out.println("[Flask RAW] " + (json == null ? "null" : json.substring(0, Math.min(json.length(), 400))));

        // 3) 再映射到 DTO（忽略未知字段 + 支持 LocalDateTime）
        ObjectMapper mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        RecognitionResult r = mapper.readValue(json, RecognitionResult.class);

        // 4) 兼容旧字段（如果 detectionResult 存在但 label/confidence 为空，则回填）
        if (r != null && r.getDetectionResult() != null) {
            if (r.getLabel() == null && r.getDetectionResult().getColorGrade() != null) {
                r.setLabel(String.valueOf(r.getDetectionResult().getColorGrade()));
            }
            if (r.getConfidence() == null && r.getDetectionResult().getConfidence() != null) {
                r.setConfidence(r.getDetectionResult().getConfidence().floatValue());
            }
        }

        return ResponseEntity.status(resp.getStatusCode()).body(r);
    }

    // 辅助类：把 MultipartFile 适配为 RestTemplate 可用的 Resource
    static class MultipartInputStreamFileResource extends InputStreamResource {
        private final String filename;
        private final long contentLength;

        MultipartInputStreamFileResource(InputStream inputStream, String filename, long contentLength) {
            super(inputStream);
            this.filename = filename;
            this.contentLength = contentLength;
        }
        @Override public String getFilename() { return filename; }
        @Override public long contentLength() { return contentLength; }
    }
}
