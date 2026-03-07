package com.nabilbennai.f1sets.model.dto.aidifficulty;

public record AiDifficultyCalculationResponseDto(
    Integer difficulty, ConfidenceBandDto confidence, Integer curveVersion, String notes) {

  public record ConfidenceBandDto(Integer min, Integer max) {}
}
