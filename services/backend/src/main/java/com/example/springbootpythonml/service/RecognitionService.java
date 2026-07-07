package com.example.springbootpythonml.service;

import com.example.springbootpythonml.dto.RecognitionHistoryItem;
import com.example.springbootpythonml.dto.RecognitionResult;
import com.example.springbootpythonml.entity.RecognitionRecord;
import com.example.springbootpythonml.repository.RecognitionRecordRepository;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RecognitionService {

    private final RestTemplate restTemplate;
    private final RecognitionRecordRepository recordRepository;
    private final ObjectMapper objectMapper;
    private final String flaskBaseUrl;
    private final Path uploadPath;

    public RecognitionService(RestTemplate restTemplate,
                              RecognitionRecordRepository recordRepository,
                              @Value("${python.service.url}") String flaskBaseUrl,
                              @Value("${app.upload-dir:uploads}") String uploadDir) {
        this.restTemplate = restTemplate;
        this.recordRepository = recordRepository;
        this.flaskBaseUrl = flaskBaseUrl;
        this.uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public RecognitionResult recognize(MultipartFile file, boolean includeImages, Long userId) throws IOException {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new MultipartInputStreamFileResource(
                file.getInputStream(), file.getOriginalFilename(), file.getSize()));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> req = new HttpEntity<>(body, headers);
        String url = flaskBaseUrl + "/predict?images=" + (includeImages ? "1" : "0");

        String json;
        try {
            ResponseEntity<String> resp = restTemplate.postForEntity(url, req, String.class);
            json = resp.getBody();
        } catch (HttpStatusCodeException e) {
            json = e.getResponseBodyAsString();
            if (json == null || json.isBlank()) {
                throw e;
            }
        }
        if (json == null || json.isBlank()) {
            throw new IllegalStateException("模型服务返回为空");
        }

        RecognitionResult result = objectMapper.readValue(json, RecognitionResult.class);
        if (result.getErrorMessage() != null) {
            return result;
        }
        String storedImageUri = saveUpload(file);
        result.setImageUri(storedImageUri);

        if (result.getDetectionResult() != null) {
            if (result.getLabel() == null && result.getDetectionResult().getColorGrade() != null) {
                result.setLabel(String.valueOf(result.getDetectionResult().getColorGrade()));
            }
            if (result.getConfidence() == null && result.getDetectionResult().getConfidence() != null) {
                result.setConfidence(result.getDetectionResult().getConfidence().floatValue());
            }
        }

        if (userId != null && result.getDetectionResult() != null) {
            RecognitionRecord record = new RecognitionRecord();
            record.setUserId(userId);
            record.setImageUri(storedImageUri);
            record.setCottonAreaImage(result.getCottonAreaImage());
            record.setImpurityAreaImage(result.getImpurityAreaImage());
            record.setCottonMaskImage(result.getCottonMaskImage());
            record.setImpurityMaskImage(result.getImpurityMaskImage());
            record.setCottonOverlayImage(result.getCottonOverlayImage());
            record.setImpurityOverlayImage(result.getImpurityOverlayImage());
            record.setBlackBackgroundImpurityOverlay(result.getBlackBackgroundImpurityOverlay());
            record.setColorGrade(result.getDetectionResult().getColorGrade());
            record.setImpurityGrade(result.getDetectionResult().getImpurityGrade());
            record.setCottonArea(result.getDetectionResult().getCottonArea());
            record.setImpurityArea(result.getDetectionResult().getImpurityArea());
            record.setAreaRatio(result.getDetectionResult().getAreaRatio());
            record.setConfidence(result.getDetectionResult().getConfidence());
            record.setConclusion(result.getConclusion());
            record = recordRepository.save(record);

            result.setId(record.getId());
            result.setImageUri(record.getImageUri());
            result.setCreatedAt(record.getCreatedAt());
            result.setConclusion(record.getConclusion());
        }

        return result;
    }

    public List<RecognitionHistoryItem> getHistory(Long userId) {
        return recordRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(RecognitionHistoryItem::from)
                .collect(Collectors.toList());
    }

    public void deleteHistory(List<Long> ids, Long userId) {
        List<RecognitionRecord> records = recordRepository.findAllById(ids);
        records = records.stream()
                .filter(r -> r.getUserId().equals(userId))
                .collect(Collectors.toList());
        recordRepository.deleteAll(records);
    }

    private String saveUpload(MultipartFile file) throws IOException {
        Files.createDirectories(uploadPath);

        String storedFilename = UUID.randomUUID() + extensionOf(file.getOriginalFilename());
        Path target = uploadPath.resolve(storedFilename).normalize();
        if (!target.startsWith(uploadPath)) {
            throw new IOException("上传路径不合法");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        }

        return "/uploads/" + storedFilename;
    }

    private String extensionOf(String filename) {
        if (filename == null) {
            return ".jpg";
        }

        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == filename.length() - 1) {
            return ".jpg";
        }

        String extension = filename.substring(dotIndex).toLowerCase(Locale.ROOT);
        return switch (extension) {
            case ".jpg", ".jpeg", ".png", ".webp" -> extension;
            default -> ".jpg";
        };
    }

    static class MultipartInputStreamFileResource extends InputStreamResource {
        private final String filename;
        private final long contentLength;

        MultipartInputStreamFileResource(InputStream inputStream, String filename, long contentLength) {
            super(inputStream);
            this.filename = filename;
            this.contentLength = contentLength;
        }

        @Override
        public String getFilename() { return filename; }

        @Override
        public long contentLength() { return contentLength; }
    }
}
