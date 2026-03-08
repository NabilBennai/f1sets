package com.nabilbennai.f1sets.model.dto.chat;

import java.util.List;

public record ChatHistoryResponseDto(Long friendId, List<ChatMessageDto> messages) {}
