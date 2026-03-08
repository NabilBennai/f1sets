package com.nabilbennai.f1sets.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabilbennai.f1sets.model.dto.chat.ChatMessageDto;
import com.nabilbennai.f1sets.service.ChatService;
import java.io.IOException;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

@Component
@RequiredArgsConstructor
public class ChatWebSocketHandler extends TextWebSocketHandler {

  private final ObjectMapper objectMapper;
  private final ChatService chatService;

  private final ConcurrentHashMap<Long, Set<WebSocketSession>> sessionsByUser =
      new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, Long> userBySessionId = new ConcurrentHashMap<>();

  @Override
  public void afterConnectionEstablished(WebSocketSession session) throws Exception {
    Long userId = extractUserId(session);
    if (userId == null) {
      session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Missing authenticated user"));
      return;
    }

    sessionsByUser.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(session);
    userBySessionId.put(session.getId(), userId);
  }

  @Override
  protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
    Long senderId = extractUserId(session);
    if (senderId == null) {
      sendError(session, "Authentication is required");
      return;
    }

    IncomingEnvelope incoming;
    try {
      incoming = objectMapper.readValue(message.getPayload(), IncomingEnvelope.class);
    } catch (Exception exception) {
      sendError(session, "Invalid message payload");
      return;
    }

    if (incoming == null || incoming.recipientId() == null) {
      if (incoming != null && incoming.readFriendId() != null) {
        handleReadReceipt(session, senderId, incoming.readFriendId());
        return;
      }
      sendError(session, "Recipient is required");
      return;
    }
    if (incoming.content() == null || incoming.content().trim().isEmpty()) {
      sendError(session, "Message content is required");
      return;
    }

    try {
      ChatMessageDto persisted =
          chatService.createMessage(senderId, incoming.recipientId(), incoming.content());
      ChatMessageDto recipientView =
          new ChatMessageDto(
              persisted.id(),
              persisted.senderId(),
              persisted.recipientId(),
              persisted.content(),
              persisted.createdAt(),
              false,
              persisted.readAt());

      sendToUser(senderId, new OutgoingEnvelope("message", persisted, null, null, null));
      sendToUser(
          incoming.recipientId(), new OutgoingEnvelope("message", recipientView, null, null, null));
    } catch (Exception exception) {
      sendError(session, exception.getMessage());
    }
  }

  @Override
  public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
    removeSession(session);
    if (session.isOpen()) {
      session.close(CloseStatus.SERVER_ERROR);
    }
  }

  @Override
  public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
    removeSession(session);
  }

  private void sendToUser(Long userId, OutgoingEnvelope payload) {
    Set<WebSocketSession> sessions = sessionsByUser.get(userId);
    if (sessions == null || sessions.isEmpty()) {
      return;
    }

    for (WebSocketSession targetSession : sessions) {
      if (!targetSession.isOpen()) {
        continue;
      }
      try {
        String json = objectMapper.writeValueAsString(payload);
        targetSession.sendMessage(new TextMessage(json));
      } catch (IOException ignored) {
        // Ignore failed push for one client session.
      }
    }
  }

  private void sendError(WebSocketSession session, String message) throws IOException {
    if (!session.isOpen()) {
      return;
    }
    String normalized = message == null || message.isBlank() ? "Unexpected error" : message;
    session.sendMessage(
        new TextMessage(
            objectMapper.writeValueAsString(
                new OutgoingEnvelope("error", null, normalized, null, null))));
  }

  private void handleReadReceipt(WebSocketSession session, Long readerId, Long friendId)
      throws IOException {
    try {
      ChatService.ReadReceiptResult result = chatService.markConversationAsRead(readerId, friendId);
      if (result.markedCount() <= 0) {
        return;
      }

      sendToUser(friendId, new OutgoingEnvelope("read", null, null, readerId, result.readAt()));
    } catch (Exception exception) {
      sendError(session, exception.getMessage());
    }
  }

  private Long extractUserId(WebSocketSession session) {
    Object userIdValue = session.getAttributes().get(ChatWebSocketAuthInterceptor.ATTR_USER_ID);
    if (userIdValue instanceof Long userId) {
      return userId;
    }
    if (userIdValue instanceof Integer userId) {
      return userId.longValue();
    }
    return null;
  }

  private void removeSession(WebSocketSession session) {
    Long userId = userBySessionId.remove(session.getId());
    if (userId == null) {
      userId = extractUserId(session);
    }
    if (userId == null) {
      return;
    }

    Set<WebSocketSession> sessions = sessionsByUser.get(userId);
    if (sessions == null) {
      return;
    }
    sessions.remove(session);
    if (sessions.isEmpty()) {
      sessionsByUser.remove(userId, sessions);
    }
  }

  private record IncomingEnvelope(Long recipientId, String content, Long readFriendId) {}

  private record OutgoingEnvelope(
      String type, ChatMessageDto message, String error, Long friendId, Instant readAt) {}
}
