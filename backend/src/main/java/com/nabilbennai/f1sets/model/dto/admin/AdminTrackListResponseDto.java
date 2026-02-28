package com.nabilbennai.f1sets.model.dto.admin;

import java.util.List;

public record AdminTrackListResponseDto(String gameCode, List<AdminTrackDto> tracks) {}
