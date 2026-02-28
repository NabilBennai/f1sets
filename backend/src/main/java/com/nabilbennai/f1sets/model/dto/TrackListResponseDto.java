package com.nabilbennai.f1sets.model.dto;

import java.util.List;

public record TrackListResponseDto(
    String gameCode,
    List<TrackListItemDto> tracks,
    int page,
    int size,
    long totalTracks,
    int totalPages) {}
