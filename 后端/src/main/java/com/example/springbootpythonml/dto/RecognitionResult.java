package com.example.springbootpythonml.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

/**
 * 图像识别结果 DTO（匹配 Flask 新结构 + 兼容旧字段）
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RecognitionResult {

    // ===== 新增：与 Flask 顶层字段对应 =====
    private String cottonAreaImage;     // data:image/png;base64,...
    private String impurityAreaImage;   // data:image/png;base64,...
    private DetectionResult detectionResult; // 对应 Flask 的 detectionResult {...}

    // ===== 兼容旧字段（老前端/日志可能还在用）=====
    private String label;       // 可由 detectionResult.colorGrade 转为字符串回填
    private Float confidence;   // 可由 detectionResult.confidence 回填

    // 通用
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
    public String getCottonAreaImage() { return cottonAreaImage; }
    public void setCottonAreaImage(String cottonAreaImage) { this.cottonAreaImage = cottonAreaImage; }

    public String getImpurityAreaImage() { return impurityAreaImage; }
    public void setImpurityAreaImage(String impurityAreaImage) { this.impurityAreaImage = impurityAreaImage; }

    public DetectionResult getDetectionResult() { return detectionResult; }
    public void setDetectionResult(DetectionResult detectionResult) { this.detectionResult = detectionResult; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Float getConfidence() { return confidence; }
    public void setConfidence(Float confidence) { this.confidence = confidence; }
    public void setConfidence(double confidence) { this.confidence = (float) confidence; }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    @Override
    public String toString() {
        return "RecognitionResult{" +
                "cottonAreaImage(len)=" + (cottonAreaImage == null ? 0 : cottonAreaImage.length()) +
                ", impurityAreaImage(len)=" + (impurityAreaImage == null ? 0 : impurityAreaImage.length()) +
                ", detectionResult=" + (detectionResult == null ? null : detectionResult.getColorGrade()) +
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
