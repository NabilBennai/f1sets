package com.nabilbennai.f1sets.model.dto.setup;

import java.time.Instant;

public record SetupReportItemDto(
    Long id,
    Long setupId,
    Long reporterId,
    String reason,
    String status,
    Instant createdAt,
    Instant resolvedAt,
    Long resolvedBy) {}
