package com.example.springbootpythonml.service;

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
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class RecognitionService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final RecognitionRecordRepository recordRepository;
    private final ObjectMapper objectMapper;
    private final String flaskBaseUrl;

    public RecognitionService(RecognitionRecordRepository recordRepository,
                              @Value("${python.service.url}") String flaskBaseUrl) {
        this.recordRepository = recordRepository;
        this.flaskBaseUrl = flaskBaseUrl;
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

        ResponseEntity<String> resp = restTemplate.postForEntity(url, req, String.class);
        String json = resp.getBody();

        RecognitionResult result = objectMapper.readValue(json, RecognitionResult.class);

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
            record.setImageUri(file.getOriginalFilename());
            record.setColorGrade(result.getDetectionResult().getColorGrade());
            record.setImpurityGrade(result.getDetectionResult().getImpurityGrade());
            record.setCottonArea(result.getDetectionResult().getCottonArea());
            record.setImpurityArea(result.getDetectionResult().getImpurityArea());
            record.setAreaRatio(result.getDetectionResult().getAreaRatio());
            record.setConfidence(result.getDetectionResult().getConfidence());
            record.setConclusion("等级 " + result.getDetectionResult().getColorGrade());
            recordRepository.save(record);
        }

        return result;
    }

    public List<Map<String, Object>> getHistory(Long userId) {
        List<RecognitionRecord> records = recordRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return records.stream().map(r -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", r.getId());
            map.put("imageUri", r.getImageUri());
            map.put("colorGrade", r.getColorGrade());
            map.put("impurityGrade", r.getImpurityGrade());
            map.put("cottonArea", r.getCottonArea());
            map.put("impurityArea", r.getImpurityArea());
            map.put("areaRatio", r.getAreaRatio());
            map.put("confidence", r.getConfidence());
            map.put("conclusion", r.getConclusion());
            map.put("createdAt", r.getCreatedAt());
            return map;
        }).collect(Collectors.toList());
    }

    public void deleteHistory(List<Long> ids, Long userId) {
        List<RecognitionRecord> records = recordRepository.findAllById(ids);
        records = records.stream()
                .filter(r -> r.getUserId().equals(userId))
                .collect(Collectors.toList());
        recordRepository.deleteAll(records);
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
