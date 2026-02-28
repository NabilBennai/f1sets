package com.nabilbennai.f1sets.model.dto.setup;

import java.util.List;

public record SetupReportListResponseDto(
    String status,
    int page,
    int size,
    long totalReports,
    int totalPages,
    List<SetupReportItemDto> reports) {}
