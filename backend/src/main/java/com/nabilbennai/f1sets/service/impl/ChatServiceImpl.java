package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.dao.ChatMessageRepository;
import com.nabilbennai.f1sets.dao.UserRepository;
import com.nabilbennai.f1sets.miscellaneous.UnauthorizedException;
import com.nabilbennai.f1sets.model.dto.chat.ChatHistoryResponseDto;
import com.nabilbennai.f1sets.model.dto.chat.ChatMessageDto;
import com.nabilbennai.f1sets.model.entities.ChatMessage;
import com.nabilbennai.f1sets.service.ChatService;
import com.nabilbennai.f1sets.service.FriendshipService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

  private final ChatMessageRepository chatMessageRepository;
  private final UserRepository userRepository;
  private final FriendshipService friendshipService;

  @Override
  @Transactional(readOnly = true)
  public Long requireUserIdByEmail(String authenticatedEmail) {
    return userRepository
        .findByEmail(normalizeEmail(authenticatedEmail))
        .map(user -> user.getId())
        .orElseThrow(() -> new UnauthorizedException("User authentication is required"));
  }

  @Override
  @Transactional
  public ChatHistoryResponseDto getHistory(String authenticatedEmail, Long friendId, int limit) {
    Long requesterUserId = requireUserIdByEmail(authenticatedEmail);
    List<ChatMessageDto> messages = getConversationByUserIds(requesterUserId, friendId, limit);
    return new ChatHistoryResponseDto(friendId, messages);
  }

  @Override
  @Transactional
  public List<ChatMessageDto> getConversationByUserIds(
      Long requesterUserId, Long friendId, int limit) {
    if (requesterUserId == null || friendId == null || requesterUserId <= 0 || friendId <= 0) {
      throw new IllegalArgumentException("both user ids are required");
    }
    if (!friendshipService.areFriends(requesterUserId, friendId)) {
      throw new AccessDeniedException("You can only read messages from friends");
    }
    markConversationAsRead(requesterUserId, friendId);

    int normalizedLimit = Math.min(Math.max(limit, 1), 200);
    List<ChatMessage> recentFirst =
        chatMessageRepository.findConversation(
            requesterUserId, friendId, PageRequest.of(0, normalizedLimit));

    List<ChatMessage> chronological = new ArrayList<>(recentFirst);
    chronological.sort(
        Comparator.comparing(ChatMessage::getCreatedAt)
            .thenComparing(ChatMessage::getId, Comparator.nullsLast(Comparator.naturalOrder())));
    return chronological.stream().map(message -> toDto(message, requesterUserId)).toList();
  }

  @Override
  @Transactional
  public ChatMessageDto createMessage(Long senderId, Long recipientId, String content) {
    if (senderId == null || recipientId == null || senderId <= 0 || recipientId <= 0) {
      throw new IllegalArgumentException("sender and recipient are required");
    }
    if (senderId.equals(recipientId)) {
      throw new IllegalArgumentException("sender and recipient cannot be the same");
    }
    if (!friendshipService.areFriends(senderId, recipientId)) {
      throw new AccessDeniedException("You can only send messages to friends");
    }

    String normalizedContent = normalizeContent(content);
    ChatMessage message = new ChatMessage();
    message.setSenderId(senderId);
    message.setRecipientId(recipientId);
    message.setContent(normalizedContent);

    ChatMessage saved = chatMessageRepository.save(message);
    return toDto(saved, senderId);
  }

  @Override
  @Transactional
  public ReadReceiptResult markConversationAsRead(Long readerUserId, Long friendId) {
    if (readerUserId == null || friendId == null || readerUserId <= 0 || friendId <= 0) {
      throw new IllegalArgumentException("both user ids are required");
    }
    if (!friendshipService.areFriends(readerUserId, friendId)) {
      throw new AccessDeniedException("You can only mark messages from friends");
    }

    Instant readAt = Instant.now();
    int updatedCount = chatMessageRepository.markConversationAsRead(readerUserId, friendId, readAt);
    return new ReadReceiptResult(updatedCount, readAt);
  }

  private ChatMessageDto toDto(ChatMessage message, Long requesterUserId) {
    return new ChatMessageDto(
        message.getId(),
        message.getSenderId(),
        message.getRecipientId(),
        message.getContent(),
        message.getCreatedAt(),
        message.getSenderId().equals(requesterUserId),
        message.getReadAt());
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeContent(String content) {
    String normalized = content == null ? "" : content.trim();
    if (!StringUtils.hasText(normalized)) {
      throw new IllegalArgumentException("message content is required");
    }
    if (normalized.length() > 2000) {
      throw new IllegalArgumentException("message content is too long");
    }
    return normalized;
  }
}
