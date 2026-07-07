package com.example.springbootpythonml.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "recognition_records")
public class RecognitionRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "image_uri", length = 500)
    private String imageUri;

    @Lob
    @Column(name = "cotton_area_image", columnDefinition = "LONGTEXT")
    private String cottonAreaImage;

    @Lob
    @Column(name = "impurity_area_image", columnDefinition = "LONGTEXT")
    private String impurityAreaImage;

    @Lob
    @Column(name = "cotton_mask_image", columnDefinition = "LONGTEXT")
    private String cottonMaskImage;

    @Lob
    @Column(name = "impurity_mask_image", columnDefinition = "LONGTEXT")
    private String impurityMaskImage;

    @Lob
    @Column(name = "cotton_overlay_image", columnDefinition = "LONGTEXT")
    private String cottonOverlayImage;

    @Lob
    @Column(name = "impurity_overlay_image", columnDefinition = "LONGTEXT")
    private String impurityOverlayImage;

    @Lob
    @Column(name = "black_background_impurity_overlay", columnDefinition = "LONGTEXT")
    private String blackBackgroundImpurityOverlay;

    @Column(name = "color_grade")
    private Integer colorGrade;

    @Column(name = "impurity_grade")
    private Integer impurityGrade;

    @Column(name = "cotton_area")
    private Double cottonArea;

    @Column(name = "impurity_area")
    private Integer impurityArea;

    @Column(name = "area_ratio")
    private Double areaRatio;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "conclusion", length = 500)
    private String conclusion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    public RecognitionRecord() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getImageUri() { return imageUri; }
    public void setImageUri(String imageUri) { this.imageUri = imageUri; }

    public String getCottonAreaImage() { return cottonAreaImage; }
    public void setCottonAreaImage(String cottonAreaImage) { this.cottonAreaImage = cottonAreaImage; }

    public String getImpurityAreaImage() { return impurityAreaImage; }
    public void setImpurityAreaImage(String impurityAreaImage) { this.impurityAreaImage = impurityAreaImage; }

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
