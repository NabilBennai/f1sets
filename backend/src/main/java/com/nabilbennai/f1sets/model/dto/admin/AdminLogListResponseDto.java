package com.nabilbennai.f1sets.model.dto.admin;

import java.time.Instant;
import java.util.List;

public record AdminLogListResponseDto(
    int page,
    int size,
    long totalElements,
    int totalPages,
    String sortBy,
    String sortDirection,
    String level,
    String httpMethod,
    Integer statusFrom,
    Integer statusTo,
    String pathContains,
    String userEmailContains,
    Instant createdFrom,
    Instant createdTo,
    List<AdminLogItemDto> items) {}
