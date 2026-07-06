package com.example.springbootpythonml.dto;

import com.example.springbootpythonml.entity.RecognitionRecord;

import java.time.LocalDateTime;

public class RecognitionHistoryItem {

    private Long id;
    private String imageUri;
    private Integer colorGrade;
    private Integer impurityGrade;
    private Double cottonArea;
    private Integer impurityArea;
    private Double areaRatio;
    private Double confidence;
    private DetectionResult detectionResult;
    private String label;
    private String filename;
    private String cottonAreaImage;
    private String impurityAreaImage;
    private String conclusion;
    private LocalDateTime createdAt;
    private LocalDateTime timestamp;

    public static RecognitionHistoryItem from(RecognitionRecord record) {
        RecognitionHistoryItem item = new RecognitionHistoryItem();
        item.setId(record.getId());
        item.setImageUri(record.getImageUri());
        item.setColorGrade(record.getColorGrade());
        item.setImpurityGrade(record.getImpurityGrade());
        item.setCottonArea(record.getCottonArea());
        item.setImpurityArea(record.getImpurityArea());
        item.setAreaRatio(record.getAreaRatio());
        item.setConfidence(record.getConfidence());
        item.setLabel(record.getColorGrade() == null ? null : String.valueOf(record.getColorGrade()));
        item.setFilename(null);
        item.setCottonAreaImage(null);
        item.setImpurityAreaImage(null);
        item.setConclusion(record.getConclusion());
        item.setCreatedAt(record.getCreatedAt());
        item.setTimestamp(record.getCreatedAt());

        DetectionResult detection = new DetectionResult();
        detection.setColorGrade(record.getColorGrade());
        detection.setImpurityGrade(record.getImpurityGrade());
        detection.setCottonArea(record.getCottonArea());
        detection.setImpurityArea(record.getImpurityArea());
        detection.setAreaRatio(record.getAreaRatio());
        detection.setConfidence(record.getConfidence());
        item.setDetectionResult(detection);
        return item;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getImageUri() { return imageUri; }
    public void setImageUri(String imageUri) { this.imageUri = imageUri; }

    public Integer getColorGrade() { return colorGrade; }
    public void setColorGrade(Integer colorGrade) { this.colorGrade = colorGrade; }

    public Integer getImpurityGrade() { return impurityGrade; }
    public void setImpurityGrade(Integer impurityGrade) { this.impurityGrade = impurityGrade; }

    public Double getCottonArea() { return cottonArea; }
    public void setCottonArea(Double cottonArea) { this.cottonArea = cottonArea; }

    public Integer getImpurityArea() { return impurityArea; }
    public void setImpurityArea(Integer impurityArea) { this.impurityArea = impurityArea; }

    public Double getAreaRatio() { return areaRatio; }
    public void setAreaRatio(Double areaRatio) { this.areaRatio = areaRatio; }

    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public DetectionResult getDetectionResult() { return detectionResult; }
    public void setDetectionResult(DetectionResult detectionResult) { this.detectionResult = detectionResult; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getCottonAreaImage() { return cottonAreaImage; }
    public void setCottonAreaImage(String cottonAreaImage) { this.cottonAreaImage = cottonAreaImage; }

    public String getImpurityAreaImage() { return impurityAreaImage; }
    public void setImpurityAreaImage(String impurityAreaImage) { this.impurityAreaImage = impurityAreaImage; }

    public String getConclusion() { return conclusion; }
    public void setConclusion(String conclusion) { this.conclusion = conclusion; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
