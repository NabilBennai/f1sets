package com.nabilbennai.f1sets.model.dto.admin;

import java.math.BigDecimal;

public record UpdateTrackRequestDto(
    String slug, String grandPrixName, String circuitName, BigDecimal lengthKm) {}
