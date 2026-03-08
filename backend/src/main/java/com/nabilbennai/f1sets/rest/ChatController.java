package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.chat.ChatHistoryResponseDto;
import com.nabilbennai.f1sets.service.ChatService;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/chat")
public class ChatController {

  private final ChatService chatService;

  @GetMapping("/history/{friendId}")
  public ResponseEntity<ChatHistoryResponseDto> getHistory(
      Authentication authentication,
      @PathVariable @Min(1) Long friendId,
      @RequestParam(defaultValue = "200") @Min(1) int limit) {
    return ResponseEntity.ok(chatService.getHistory(authentication.getName(), friendId, limit));
  }
}
