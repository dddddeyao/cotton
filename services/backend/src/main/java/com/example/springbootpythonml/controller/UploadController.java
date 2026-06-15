package com.example.springbootpythonml.controller;

import com.example.springbootpythonml.dto.ApiResponse;
import com.example.springbootpythonml.dto.RecognitionResult;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class UploadController {

    private final RecognitionRequestHandler recognitionRequestHandler;

    public UploadController(RecognitionRequestHandler recognitionRequestHandler) {
        this.recognitionRequestHandler = recognitionRequestHandler;
    }

    /**
     * Legacy upload path kept for compatibility. New clients should use POST /recognition.
     */
    @PostMapping("/upload")
    public ResponseEntity<ApiResponse<RecognitionResult>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "images", required = false, defaultValue = "0") String images,
            Authentication authentication) {

        boolean includeImages = !"0".equals(images);
        Long userId = authentication != null ? (Long) authentication.getPrincipal() : null;

        return recognitionRequestHandler.handle(file, includeImages, userId);
    }
}
