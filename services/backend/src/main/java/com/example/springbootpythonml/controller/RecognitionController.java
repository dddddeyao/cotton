package com.example.springbootpythonml.controller;

import com.example.springbootpythonml.dto.ApiResponse;
import com.example.springbootpythonml.dto.DeleteHistoryRequest;
import com.example.springbootpythonml.dto.RecognitionHistoryItem;
import com.example.springbootpythonml.dto.RecognitionResult;
import com.example.springbootpythonml.service.RecognitionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/recognition")
public class RecognitionController {

    private final RecognitionService recognitionService;
    private final RecognitionRequestHandler recognitionRequestHandler;

    public RecognitionController(RecognitionService recognitionService,
                                 RecognitionRequestHandler recognitionRequestHandler) {
        this.recognitionService = recognitionService;
        this.recognitionRequestHandler = recognitionRequestHandler;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RecognitionResult>> recognize(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "images", required = false, defaultValue = "1") String images,
            Authentication authentication) {

        boolean includeImages = !"0".equals(images);
        Long userId = authentication != null ? (Long) authentication.getPrincipal() : null;

        return recognitionRequestHandler.handle(file, includeImages, userId);
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<RecognitionHistoryItem>>> getHistory(
            Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(401, "请先登录"));
        }

        Long userId = (Long) authentication.getPrincipal();
        List<RecognitionHistoryItem> history = recognitionService.getHistory(userId);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @DeleteMapping("/history")
    public ResponseEntity<ApiResponse<Void>> deleteHistory(
            @RequestBody DeleteHistoryRequest body,
            Authentication authentication) {

        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(401, "请先登录"));
        }

        List<Long> ids = body == null ? null : body.getIds();
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(400, "请指定要删除的记录"));
        }

        Long userId = (Long) authentication.getPrincipal();
        recognitionService.deleteHistory(ids, userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
