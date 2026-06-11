package com.example.springbootpythonml.service;

import com.example.springbootpythonml.dto.RecognitionResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
public class ModelInferenceService {

    private final String pythonServiceUrl;
    private final RestTemplate restTemplate;

    public ModelInferenceService(@Value("${python.service.url}") String flaskBaseUrl,
                                  RestTemplate restTemplate) {
        this.pythonServiceUrl = flaskBaseUrl + "/predict";
        this.restTemplate = restTemplate;
    }

    public RecognitionResult predict(byte[] imageBytes) {
        try {
            LinkedMultiValueMap<String, Object> formData = new LinkedMultiValueMap<>();
            formData.add("file", new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return "uploaded.jpg";
                }
            });

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<LinkedMultiValueMap<String, Object>> requestEntity =
                    new HttpEntity<>(formData, headers);

            ResponseEntity<RecognitionResult> response = restTemplate.postForEntity(
                    pythonServiceUrl,
                    requestEntity,
                    RecognitionResult.class
            );

            return response.getBody();
        } catch (Exception e) {
            return createErrorResult("调用 Python 服务失败: " + e.getMessage());
        }
    }

    private RecognitionResult createErrorResult(String message) {
        RecognitionResult error = new RecognitionResult();
        error.setLabel("Error");
        error.setConfidence(0.0f);
        error.setErrorMessage(message);
        return error;
    }
}