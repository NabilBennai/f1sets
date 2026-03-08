package com.nabilbennai.f1sets.model.dto.friends;

import java.time.Instant;

public record FriendRequestItemDto(
    Long requestId,
    String status,
    String direction,
    FriendSummaryDto user,
    Instant createdAt,
    Instant respondedAt) {}
