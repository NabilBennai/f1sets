package com.nabilbennai.f1sets.model.dto.admin;

import java.time.Instant;

public record AdminLogItemDto(
    Long id,
    Instant createdAt,
    String level,
    String httpMethod,
    String path,
    String queryString,
    Integer statusCode,
    Long durationMs,
    String userEmail,
    String userRole,
    String clientIp,
    String userAgent,
    String message,
    String requestPayloadJson,
    String responseBodyJson) {}
