package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.friends.FriendRequestItemDto;
import com.nabilbennai.f1sets.model.dto.friends.FriendRequestsResponseDto;
import com.nabilbennai.f1sets.model.dto.friends.FriendSummaryDto;
import java.util.List;

public interface FriendshipService {

  List<FriendSummaryDto> listFriends(String authenticatedEmail);

  List<FriendSummaryDto> searchUsers(String authenticatedEmail, String query, int limit);

  FriendRequestsResponseDto listRequests(String authenticatedEmail);

  FriendRequestItemDto sendRequest(String authenticatedEmail, Long receiverUserId);

  FriendRequestItemDto acceptRequest(String authenticatedEmail, Long requestId);

  FriendRequestItemDto rejectRequest(String authenticatedEmail, Long requestId);

  void removeFriend(String authenticatedEmail, Long friendUserId);

  boolean areFriends(Long userIdA, Long userIdB);
}
