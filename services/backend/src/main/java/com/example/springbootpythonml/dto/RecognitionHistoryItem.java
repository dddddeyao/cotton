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
    private String conclusion;
    private LocalDateTime createdAt;

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
        item.setConclusion(record.getConclusion());
        item.setCreatedAt(record.getCreatedAt());
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

    public String getConclusion() { return conclusion; }
    public void setConclusion(String conclusion) { this.conclusion = conclusion; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
