package com.example.springbootpythonml.controller;

import com.example.springbootpythonml.dto.ApiResponse;
import com.example.springbootpythonml.dto.RecognitionResult;
import com.example.springbootpythonml.service.RecognitionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

@Component
public class RecognitionRequestHandler {

    private static final Logger log = LoggerFactory.getLogger(RecognitionRequestHandler.class);

    private final RecognitionService recognitionService;
    private final long maxImageBytes;
    private final long maxImagePixels;

    public RecognitionRequestHandler(RecognitionService recognitionService,
                                     @Value("${app.recognition.max-image-bytes:10485760}") long maxImageBytes,
                                     @Value("${app.recognition.max-image-pixels:25000000}") long maxImagePixels) {
        this.recognitionService = recognitionService;
        this.maxImageBytes = maxImageBytes;
        this.maxImagePixels = maxImagePixels;
    }

    public ResponseEntity<ApiResponse<RecognitionResult>> handle(
            MultipartFile file,
            boolean includeImages,
            Long userId) {
        String validationError;
        try {
            validationError = validateImageFile(file);
        } catch (IOException e) {
            log.warn("Failed to validate uploaded image", e);
            return ResponseEntity.badRequest().body(ApiResponse.error(400, "图片数据格式不正确"));
        }
        if (validationError != null) {
            HttpStatus status = validationError.contains("不能超过")
                    ? HttpStatus.PAYLOAD_TOO_LARGE
                    : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(ApiResponse.error(status.value(), validationError));
        }

        try {
            RecognitionResult result = recognitionService.recognize(file, includeImages, userId);

            if (result.getErrorMessage() != null) {
                log.warn("Model service returned an error: {}", result.getErrorMessage());
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                        .body(ApiResponse.error(502, "模型服务暂时不可用，请稍后重试"));
            }

            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (IOException e) {
            log.warn("Failed to save or read recognition image", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error(500, "图片处理失败，请稍后重试"));
        } catch (RuntimeException e) {
            log.warn("Model service call failed", e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ApiResponse.error(502, "模型服务暂时不可用，请稍后重试"));
        }
    }

    private String validateImageFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            return "请上传图片文件";
        }
        if (file.getSize() > maxImageBytes) {
            return "图片文件不能超过 " + maxImageSizeMb() + "MB";
        }

        String detectedMime = detectImageMime(file);
        if (detectedMime == null) {
            return "图片数据格式不正确";
        }
        if (!isContentTypeCompatible(file.getContentType(), detectedMime)) {
            return "图片类型与文件内容不一致";
        }

        if (!"image/webp".equals(detectedMime)) {
            BufferedImage image = ImageIO.read(file.getInputStream());
            if (image == null) {
                return "图片数据格式不正确";
            }
            long pixels = (long) image.getWidth() * (long) image.getHeight();
            if (pixels > maxImagePixels) {
                return "图片尺寸过大";
            }
        }

        return null;
    }

    private String detectImageMime(MultipartFile file) throws IOException {
        byte[] header;
        try (InputStream inputStream = file.getInputStream()) {
            header = inputStream.readNBytes(16);
        }

        if (header.length >= 3
                && (header[0] & 0xff) == 0xff
                && (header[1] & 0xff) == 0xd8
                && (header[2] & 0xff) == 0xff) {
            return "image/jpeg";
        }
        if (header.length >= 8
                && (header[0] & 0xff) == 0x89
                && header[1] == 0x50
                && header[2] == 0x4e
                && header[3] == 0x47
                && header[4] == 0x0d
                && header[5] == 0x0a
                && header[6] == 0x1a
                && header[7] == 0x0a) {
            return "image/png";
        }
        if (header.length >= 12
                && header[0] == 0x52
                && header[1] == 0x49
                && header[2] == 0x46
                && header[3] == 0x46
                && header[8] == 0x57
                && header[9] == 0x45
                && header[10] == 0x42
                && header[11] == 0x50) {
            return "image/webp";
        }
        return null;
    }

    private boolean isContentTypeCompatible(String contentType, String detectedMime) {
        if (contentType == null || contentType.isBlank()) {
            return true;
        }
        String normalized = contentType.toLowerCase(Locale.ROOT).split(";", 2)[0].trim();
        if ("image/jpg".equals(normalized)) {
            normalized = "image/jpeg";
        }
        return normalized.equals(detectedMime);
    }

    private long maxImageSizeMb() {
        return Math.max(1, maxImageBytes / 1024 / 1024);
    }
}