package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.chat.ChatHistoryResponseDto;
import com.nabilbennai.f1sets.model.dto.chat.ChatMessageDto;
import java.time.Instant;
import java.util.List;

public interface ChatService {

  Long requireUserIdByEmail(String authenticatedEmail);

  ChatHistoryResponseDto getHistory(String authenticatedEmail, Long friendId, int limit);

  List<ChatMessageDto> getConversationByUserIds(Long requesterUserId, Long friendId, int limit);

  ChatMessageDto createMessage(Long senderId, Long recipientId, String content);

  ReadReceiptResult markConversationAsRead(Long readerUserId, Long friendId);

  record ReadReceiptResult(int markedCount, Instant readAt) {}
}
