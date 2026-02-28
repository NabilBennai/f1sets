package com.nabilbennai.f1sets.model.dto.setup;

import java.util.List;

public record SetupListResponseDto(
    String gameCode,
    String trackSlug,
    String query,
    String sessionType,
    String weatherCondition,
    String inputDevice,
    int page,
    int size,
    long totalSetups,
    int totalPages,
    List<SetupItemDto> setups) {}
