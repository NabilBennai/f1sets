package com.nabilbennai.f1sets.model.dto.setup;

import java.time.Instant;
import java.util.Map;

public record SetupItemDto(
    Long id,
    Long userId,
    String gameCode,
    String trackSlug,
    String title,
    String notes,
    String sessionType,
    String weatherCondition,
    String assistsPreset,
    String inputDevice,
    Double fuelLoadKg,
    String tyreCompound,
    long score,
    long upvotes,
    long downvotes,
    Integer userVote,
    boolean hidden,
    Map<String, Object> setupValues,
    Instant createdAt) {}
