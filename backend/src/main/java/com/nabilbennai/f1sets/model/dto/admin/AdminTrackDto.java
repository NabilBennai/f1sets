package com.nabilbennai.f1sets.model.dto.admin;

import java.math.BigDecimal;

public record AdminTrackDto(
    Long id,
    String gameCode,
    String slug,
    String grandPrixName,
    String circuitName,
    BigDecimal lengthKm,
    String trackImageUrl) {}
