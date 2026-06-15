package com.example.springbootpythonml.controller;

import com.example.springbootpythonml.dto.ApiResponse;
import com.example.springbootpythonml.dto.RecognitionResult;
import com.example.springbootpythonml.service.RecognitionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Component
public class RecognitionRequestHandler {

    private final RecognitionService recognitionService;

    public RecognitionRequestHandler(RecognitionService recognitionService) {
        this.recognitionService = recognitionService;
    }

    public ResponseEntity<ApiResponse<RecognitionResult>> handle(
            MultipartFile file,
            boolean includeImages,
            Long userId) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "请上传图片文件"));
        }

        try {
            RecognitionResult result = recognitionService.recognize(file, includeImages, userId);

            if (result.getErrorMessage() != null) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(ApiResponse.error(502, result.getErrorMessage()));
            }

            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "识别失败: " + e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ApiResponse.error(502, "模型服务调用失败: " + e.getMessage()));
        }
    }
}
