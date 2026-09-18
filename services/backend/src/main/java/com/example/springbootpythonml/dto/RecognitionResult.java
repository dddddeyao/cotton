package com.example.springbootpythonml.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.LocalDateTime;

/**
 * 图像识别结果 DTO（匹配 Flask 新结构）
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecognitionResult {

    // ===== 新增：与 Flask 顶层字段对应 =====
    private String grade;
    @JsonAlias("color_feedback_image")
    private String colorFeedbackImage;
    @JsonAlias("cotton_mask_image")
    private String cottonMaskImage;
    @JsonAlias("impurity_mask_image")
    private String impurityMaskImage;
    @JsonAlias("cotton_overlay_image")
    private String cottonOverlayImage;
    @JsonAlias("impurity_overlay_image")
    private String impurityOverlayImage;
    @JsonAlias("black_background_impurity_overlay")
    private String blackBackgroundImpurityOverlay;
    @JsonAlias("detection_result")
    private DetectionResult detectionResult; // 对应 Flask 的 detectionResult {...}

    // ===== 兼容旧字段（老前端/日志可能还在用）=====
    private String label;       // 可由 detectionResult.colorGrade 转为字符串回填
    private Float confidence;   // 可由 detectionResult.confidence 回填

    // 通用
    private Long id;
    private String imageUri;
    private LocalDateTime createdAt;
    private String conclusion;
    @JsonAlias("error")
    private String errorMessage;
    private LocalDateTime timestamp;
    private String filename;

    public RecognitionResult() {
        this.timestamp = LocalDateTime.now();
    }

    public RecognitionResult(String label, Float confidence, String errorMessage, String filename) {
        this();
        this.label = label;
        this.confidence = confidence;
        this.errorMessage = errorMessage;
        this.filename = filename;
    }

    public static RecognitionResult success(String label, float confidence, String filename) {
        return new RecognitionResult(label, confidence, null, filename);
    }

    public static RecognitionResult error(String errorMessage, String filename) {
        return new RecognitionResult(null, null, errorMessage, filename);
    }

    // ===== Getter / Setter =====

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getColorFeedbackImage() { return colorFeedbackImage; }
    public void setColorFeedbackImage(String colorFeedbackImage) { this.colorFeedbackImage = colorFeedbackImage; }
    public String getCottonMaskImage() { return cottonMaskImage; }
    public void setCottonMaskImage(String cottonMaskImage) { this.cottonMaskImage = cottonMaskImage; }

    public String getImpurityMaskImage() { return impurityMaskImage; }
    public void setImpurityMaskImage(String impurityMaskImage) { this.impurityMaskImage = impurityMaskImage; }

    public String getCottonOverlayImage() { return cottonOverlayImage; }
    public void setCottonOverlayImage(String cottonOverlayImage) { this.cottonOverlayImage = cottonOverlayImage; }

    public String getImpurityOverlayImage() { return impurityOverlayImage; }
    public void setImpurityOverlayImage(String impurityOverlayImage) { this.impurityOverlayImage = impurityOverlayImage; }

    public String getBlackBackgroundImpurityOverlay() { return blackBackgroundImpurityOverlay; }
    public void setBlackBackgroundImpurityOverlay(String blackBackgroundImpurityOverlay) {
        this.blackBackgroundImpurityOverlay = blackBackgroundImpurityOverlay;
    }

    public DetectionResult getDetectionResult() { return detectionResult; }
    public void setDetectionResult(DetectionResult detectionResult) { this.detectionResult = detectionResult; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Float getConfidence() { return confidence; }
    public void setConfidence(Float confidence) { this.confidence = confidence; }
    public void setConfidence(double confidence) { this.confidence = (float) confidence; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getImageUri() { return imageUri; }
    public void setImageUri(String imageUri) { this.imageUri = imageUri; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getConclusion() { return conclusion; }
    public void setConclusion(String conclusion) { this.conclusion = conclusion; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    @Override
    public String toString() {
        return "RecognitionResult{" +
                ", cottonMaskImage(len)=" + (cottonMaskImage == null ? 0 : cottonMaskImage.length()) +
                ", impurityMaskImage(len)=" + (impurityMaskImage == null ? 0 : impurityMaskImage.length()) +
                ", cottonOverlayImage(len)=" + (cottonOverlayImage == null ? 0 : cottonOverlayImage.length()) +
                ", impurityOverlayImage(len)=" + (impurityOverlayImage == null ? 0 : impurityOverlayImage.length()) +
                ", blackBackgroundImpurityOverlay(len)=" +
                (blackBackgroundImpurityOverlay == null ? 0 : blackBackgroundImpurityOverlay.length()) +
                ", detectionResult=" + (detectionResult == null ? null : detectionResult.getColorGrade()) +
                ", id=" + id +
                ", label='" + label + '\'' +
                ", confidence=" + confidence +
                ", errorMessage='" + errorMessage + '\'' +
                ", timestamp=" + timestamp +
                ", filename='" + filename + '\'' +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof RecognitionResult)) return false;
        RecognitionResult that = (RecognitionResult) o;
        return java.util.Objects.equals(label, that.label)
                && java.util.Objects.equals(confidence, that.confidence);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(label, confidence);
    }
}
