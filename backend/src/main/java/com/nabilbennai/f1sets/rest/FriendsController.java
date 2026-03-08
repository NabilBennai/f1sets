package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.friends.CreateFriendRequestDto;
import com.nabilbennai.f1sets.model.dto.friends.FriendRequestItemDto;
import com.nabilbennai.f1sets.model.dto.friends.FriendRequestsResponseDto;
import com.nabilbennai.f1sets.model.dto.friends.FriendSummaryDto;
import com.nabilbennai.f1sets.service.FriendshipService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/friends")
@RequiredArgsConstructor
public class FriendsController {

  private final FriendshipService friendshipService;

  @GetMapping
  public ResponseEntity<List<FriendSummaryDto>> listFriends(Authentication authentication) {
    return ResponseEntity.ok(friendshipService.listFriends(authentication.getName()));
  }

  @GetMapping("/users/search")
  public ResponseEntity<List<FriendSummaryDto>> searchUsers(
      Authentication authentication,
      @RequestParam @Size(min = 1, max = 120) String query,
      @RequestParam(defaultValue = "20") @Min(1) int limit) {
    return ResponseEntity.ok(friendshipService.searchUsers(authentication.getName(), query, limit));
  }

  @GetMapping("/requests")
  public ResponseEntity<FriendRequestsResponseDto> listRequests(Authentication authentication) {
    return ResponseEntity.ok(friendshipService.listRequests(authentication.getName()));
  }

  @PostMapping("/requests")
  public ResponseEntity<FriendRequestItemDto> createRequest(
      Authentication authentication, @Valid @RequestBody CreateFriendRequestDto request) {
    return ResponseEntity.ok(
        friendshipService.sendRequest(authentication.getName(), request.userId()));
  }

  @PostMapping("/requests/{requestId}/accept")
  public ResponseEntity<FriendRequestItemDto> acceptRequest(
      Authentication authentication, @PathVariable @Min(1) Long requestId) {
    return ResponseEntity.ok(friendshipService.acceptRequest(authentication.getName(), requestId));
  }

  @PostMapping("/requests/{requestId}/reject")
  public ResponseEntity<FriendRequestItemDto> rejectRequest(
      Authentication authentication, @PathVariable @Min(1) Long requestId) {
    return ResponseEntity.ok(friendshipService.rejectRequest(authentication.getName(), requestId));
  }

  @DeleteMapping("/{friendUserId}")
  public ResponseEntity<Void> removeFriend(
      Authentication authentication, @PathVariable @Min(1) Long friendUserId) {
    friendshipService.removeFriend(authentication.getName(), friendUserId);
    return ResponseEntity.noContent().build();
  }
}
