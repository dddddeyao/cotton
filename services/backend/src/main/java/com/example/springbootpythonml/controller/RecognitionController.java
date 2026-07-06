package com.example.springbootpythonml.controller;

import com.example.springbootpythonml.dto.ApiResponse;
import com.example.springbootpythonml.dto.DeleteHistoryRequest;
import com.example.springbootpythonml.dto.RecognitionBase64Request;
import com.example.springbootpythonml.dto.RecognitionHistoryItem;
import com.example.springbootpythonml.dto.RecognitionResult;
import com.example.springbootpythonml.service.RecognitionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
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

    @PostMapping(value = "/base64", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<RecognitionResult>> recognizeBase64(
            @RequestBody RecognitionBase64Request request,
            @RequestParam(value = "images", required = false, defaultValue = "1") String images,
            Authentication authentication) {

        if (request == null || request.getImageBase64() == null || request.getImageBase64().isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "请上传图片文件"));
        }

        byte[] imageBytes;
        try {
            imageBytes = Base64.getDecoder().decode(stripDataUrlPrefix(request.getImageBase64()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "图片数据格式不正确"));
        }

        String filename = request.getFilename() == null || request.getFilename().isBlank()
                ? "cotton-sample.jpg"
                : request.getFilename();
        String contentType = request.getContentType() == null || request.getContentType().isBlank()
                ? MediaType.IMAGE_JPEG_VALUE
                : request.getContentType();
        MultipartFile file = new InMemoryMultipartFile("file", filename, contentType, imageBytes);
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

    private static String stripDataUrlPrefix(String value) {
        int commaIndex = value.indexOf(',');
        if (value.startsWith("data:") && commaIndex >= 0) {
            return value.substring(commaIndex + 1);
        }
        return value;
    }

    private static final class InMemoryMultipartFile implements MultipartFile {
        private final String name;
        private final String originalFilename;
        private final String contentType;
        private final byte[] content;

        private InMemoryMultipartFile(String name, String originalFilename, String contentType, byte[] content) {
            this.name = name;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.content = content;
        }

        @Override
        public String getName() {
            return name;
        }

        @Override
        public String getOriginalFilename() {
            return originalFilename;
        }

        @Override
        public String getContentType() {
            return contentType;
        }

        @Override
        public boolean isEmpty() {
            return content.length == 0;
        }

        @Override
        public long getSize() {
            return content.length;
        }

        @Override
        public byte[] getBytes() {
            return content;
        }

        @Override
        public InputStream getInputStream() {
            return new ByteArrayInputStream(content);
        }

        @Override
        public void transferTo(java.io.File dest) throws IOException, IllegalStateException {
            java.nio.file.Files.write(dest.toPath(), content);
        }
    }
}
