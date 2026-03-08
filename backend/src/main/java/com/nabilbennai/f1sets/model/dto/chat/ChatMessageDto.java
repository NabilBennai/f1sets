package com.nabilbennai.f1sets.model.dto.chat;

import java.time.Instant;

public record ChatMessageDto(
    Long id,
    Long senderId,
    Long recipientId,
    String content,
    Instant createdAt,
    boolean mine,
    Instant readAt) {}
