package com.example.springbootpythonml.controller;

import com.example.springbootpythonml.dto.ApiResponse;
import com.example.springbootpythonml.dto.RecognitionResult;
import com.example.springbootpythonml.service.RecognitionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/recognition")
public class RecognitionController {

    private final RecognitionService recognitionService;

    public RecognitionController(RecognitionService recognitionService) {
        this.recognitionService = recognitionService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RecognitionResult>> recognize(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "images", required = false, defaultValue = "1") String images,
            Authentication authentication) {

        boolean includeImages = !"0".equals(images);
        Long userId = authentication != null ? (Long) authentication.getPrincipal() : null;

        try {
            RecognitionResult result = recognitionService.recognize(file, includeImages, userId);

            if (result.getErrorMessage() != null) {
                return ResponseEntity.ok(ApiResponse.error(500, result.getErrorMessage()));
            }

            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IOException e) {
            return ResponseEntity.ok(ApiResponse.error(500, "识别失败: " + e.getMessage()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHistory(
            Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.ok(ApiResponse.error(401, "请先登录"));
        }

        Long userId = (Long) authentication.getPrincipal();
        List<Map<String, Object>> history = recognitionService.getHistory(userId);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @DeleteMapping("/history")
    public ResponseEntity<ApiResponse<Void>> deleteHistory(
            @RequestBody Map<String, List<Long>> body,
            Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.ok(ApiResponse.error(401, "请先登录"));
        }

        List<Long> ids = body.get("ids");
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.error(400, "请指定要删除的记录"));
        }

        Long userId = (Long) authentication.getPrincipal();
        recognitionService.deleteHistory(ids, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
