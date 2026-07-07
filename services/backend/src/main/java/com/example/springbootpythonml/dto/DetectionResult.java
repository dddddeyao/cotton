package com.example.springbootpythonml.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DetectionResult {
    @JsonAlias("color_grade")
    private Integer colorGrade;     // = Flask 返回的数字类别
    @JsonAlias("impurity_grade")
    private Integer impurityGrade;  // = Flask 返回的数字类别
    @JsonAlias("cotton_area")
    private Double cottonArea;      // 棉花区域百分比
    @JsonAlias("impurity_area")
    private Integer impurityArea;   // 像素
    @JsonAlias("area_ratio")
    private Double areaRatio;       // 占比
    private Double confidence;      // 置信度

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
}
