package com.nabilbennai.f1sets.model.dto.aidifficulty;

public record AiDifficultyCurveResponseDto(
    String gameCode,
    String trackSlug,
    Double slope,
    Double intercept,
    Integer esportsRefTimeMs,
    Integer avgRefTimeMs,
    Integer curveVersion,
    String source) {}
