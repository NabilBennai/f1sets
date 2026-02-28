package com.nabilbennai.f1sets.model.dto.admin;

import java.math.BigDecimal;

public record CreateTrackRequestDto(
    String slug, String grandPrixName, String circuitName, BigDecimal lengthKm) {}
