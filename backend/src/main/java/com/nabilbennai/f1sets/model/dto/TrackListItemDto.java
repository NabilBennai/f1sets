package com.nabilbennai.f1sets.model.dto;

import java.math.BigDecimal;

public record TrackListItemDto(
    Long id,
    String slug,
    String grandPrixName,
    String circuitName,
    BigDecimal lengthKm,
    boolean hasSetups,
    boolean hasLeaderboard,
    boolean hasAiDifficulty,
    String trackImageUrl) {}
