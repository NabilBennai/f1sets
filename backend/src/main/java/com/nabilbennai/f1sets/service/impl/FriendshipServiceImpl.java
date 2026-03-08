package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.dao.FriendRequestRepository;
import com.nabilbennai.f1sets.dao.FriendshipRepository;
import com.nabilbennai.f1sets.dao.UserProfileRepository;
import com.nabilbennai.f1sets.dao.UserRepository;
import com.nabilbennai.f1sets.miscellaneous.ConflictException;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import com.nabilbennai.f1sets.miscellaneous.UnauthorizedException;
import com.nabilbennai.f1sets.model.dto.friends.FriendRequestItemDto;
import com.nabilbennai.f1sets.model.dto.friends.FriendRequestsResponseDto;
import com.nabilbennai.f1sets.model.dto.friends.FriendSummaryDto;
import com.nabilbennai.f1sets.model.entities.FriendRequest;
import com.nabilbennai.f1sets.model.entities.Friendship;
import com.nabilbennai.f1sets.model.entities.User;
import com.nabilbennai.f1sets.model.entities.UserProfile;
import com.nabilbennai.f1sets.service.FriendshipService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class FriendshipServiceImpl implements FriendshipService {

  private static final String STATUS_PENDING = "PENDING";
  private static final String STATUS_ACCEPTED = "ACCEPTED";
  private static final String STATUS_REJECTED = "REJECTED";
  private static final String STATUS_CANCELLED = "CANCELLED";
  private static final int DEFAULT_SEARCH_LIMIT = 20;

  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final FriendRequestRepository friendRequestRepository;
  private final FriendshipRepository friendshipRepository;

  @Override
  @Transactional(readOnly = true)
  public List<FriendSummaryDto> listFriends(String authenticatedEmail) {
    User user = getAuthenticatedUser(authenticatedEmail);
    List<Friendship> friendships = friendshipRepository.findAllByUserId(user.getId());
    if (friendships.isEmpty()) {
      return List.of();
    }

    Set<Long> friendIds = new HashSet<>();
    for (Friendship friendship : friendships) {
      if (Objects.equals(friendship.getUserLowId(), user.getId())) {
        friendIds.add(friendship.getUserHighId());
      } else {
        friendIds.add(friendship.getUserLowId());
      }
    }

    Map<Long, User> usersById = new HashMap<>();
    userRepository
        .findAllById(friendIds)
        .forEach(candidate -> usersById.put(candidate.getId(), candidate));
    Map<Long, UserProfile> profilesByUserId = resolveProfiles(friendIds);

    return friendIds.stream()
        .map(usersById::get)
        .filter(Objects::nonNull)
        .map(friend -> toFriendSummary(friend, profilesByUserId.get(friend.getId())))
        .sorted(Comparator.comparing(FriendSummaryDto::displayName, String.CASE_INSENSITIVE_ORDER))
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public List<FriendSummaryDto> searchUsers(String authenticatedEmail, String query, int limit) {
    User requester = getAuthenticatedUser(authenticatedEmail);
    if (!StringUtils.hasText(query)) {
      return List.of();
    }

    int normalizedLimit = limit <= 0 ? DEFAULT_SEARCH_LIMIT : Math.min(limit, 50);
    String term = query.trim().toLowerCase(Locale.ROOT);

    List<User> candidates = userRepository.searchByTerm(term);
    if (candidates.isEmpty()) {
      return List.of();
    }

    Set<Long> excludedIds = new HashSet<>();
    excludedIds.add(requester.getId());
    listFriends(authenticatedEmail).forEach(friend -> excludedIds.add(friend.id()));

    friendRequestRepository
        .findByReceiverIdAndStatusOrderByCreatedAtDesc(requester.getId(), STATUS_PENDING)
        .forEach(request -> excludedIds.add(request.getSenderId()));
    friendRequestRepository
        .findBySenderIdAndStatusOrderByCreatedAtDesc(requester.getId(), STATUS_PENDING)
        .forEach(request -> excludedIds.add(request.getReceiverId()));

    List<User> filtered =
        candidates.stream().filter(candidate -> !excludedIds.contains(candidate.getId())).toList();
    if (filtered.isEmpty()) {
      return List.of();
    }

    Set<Long> userIds =
        filtered.stream().map(User::getId).collect(java.util.stream.Collectors.toSet());
    Map<Long, UserProfile> profilesByUserId = resolveProfiles(userIds);

    return filtered.stream()
        .map(user -> toFriendSummary(user, profilesByUserId.get(user.getId())))
        .limit(normalizedLimit)
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public FriendRequestsResponseDto listRequests(String authenticatedEmail) {
    User requester = getAuthenticatedUser(authenticatedEmail);

    List<FriendRequest> incoming =
        friendRequestRepository.findByReceiverIdAndStatusOrderByCreatedAtDesc(
            requester.getId(), STATUS_PENDING);
    List<FriendRequest> outgoing =
        friendRequestRepository.findBySenderIdAndStatusOrderByCreatedAtDesc(
            requester.getId(), STATUS_PENDING);

    Set<Long> relatedUserIds = new HashSet<>();
    incoming.forEach(request -> relatedUserIds.add(request.getSenderId()));
    outgoing.forEach(request -> relatedUserIds.add(request.getReceiverId()));
    Map<Long, User> usersById = new HashMap<>();
    userRepository.findAllById(relatedUserIds).forEach(user -> usersById.put(user.getId(), user));
    Map<Long, UserProfile> profilesByUserId = resolveProfiles(relatedUserIds);

    List<FriendRequestItemDto> incomingItems =
        incoming.stream()
            .map(request -> toRequestItem(request, requester.getId(), usersById, profilesByUserId))
            .toList();
    List<FriendRequestItemDto> outgoingItems =
        outgoing.stream()
            .map(request -> toRequestItem(request, requester.getId(), usersById, profilesByUserId))
            .toList();

    return new FriendRequestsResponseDto(incomingItems, outgoingItems);
  }

  @Override
  @Transactional
  public FriendRequestItemDto sendRequest(String authenticatedEmail, Long receiverUserId) {
    User sender = getAuthenticatedUser(authenticatedEmail);
    if (receiverUserId == null || receiverUserId <= 0) {
      throw new IllegalArgumentException("receiver user id is required");
    }
    if (Objects.equals(sender.getId(), receiverUserId)) {
      throw new ConflictException("You cannot add yourself as friend");
    }

    User receiver =
        userRepository
            .findById(receiverUserId)
            .orElseThrow(() -> new NotFoundException("Target user not found"));

    if (areFriends(sender.getId(), receiver.getId())) {
      throw new ConflictException("You are already friends");
    }

    FriendRequest outgoing =
        friendRequestRepository
            .findBySenderIdAndReceiverId(sender.getId(), receiver.getId())
            .orElse(null);
    if (outgoing != null && STATUS_PENDING.equals(outgoing.getStatus())) {
      throw new ConflictException("Friend request already pending");
    }

    FriendRequest incoming =
        friendRequestRepository
            .findBySenderIdAndReceiverId(receiver.getId(), sender.getId())
            .orElse(null);
    if (incoming != null && STATUS_PENDING.equals(incoming.getStatus())) {
      throw new ConflictException("User already sent you a friend request");
    }

    if (outgoing == null) {
      outgoing = new FriendRequest();
      outgoing.setSenderId(sender.getId());
      outgoing.setReceiverId(receiver.getId());
    }
    outgoing.setStatus(STATUS_PENDING);
    outgoing.setRespondedAt(null);
    FriendRequest saved = friendRequestRepository.save(outgoing);

    Map<Long, User> usersById = Map.of(sender.getId(), sender, receiver.getId(), receiver);
    Map<Long, UserProfile> profilesByUserId = resolveProfiles(usersById.keySet());
    return toRequestItem(saved, sender.getId(), usersById, profilesByUserId);
  }

  @Override
  @Transactional
  public FriendRequestItemDto acceptRequest(String authenticatedEmail, Long requestId) {
    User receiver = getAuthenticatedUser(authenticatedEmail);
    FriendRequest request =
        friendRequestRepository
            .findById(requestId)
            .orElseThrow(() -> new NotFoundException("Friend request not found"));

    if (!Objects.equals(request.getReceiverId(), receiver.getId())) {
      throw new UnauthorizedException("You are not allowed to accept this request");
    }
    if (!STATUS_PENDING.equals(request.getStatus())) {
      throw new ConflictException("Friend request is no longer pending");
    }

    request.setStatus(STATUS_ACCEPTED);
    request.setRespondedAt(Instant.now());
    FriendRequest saved = friendRequestRepository.save(request);

    createFriendshipIfMissing(request.getSenderId(), request.getReceiverId());

    User sender =
        userRepository
            .findById(request.getSenderId())
            .orElseThrow(() -> new NotFoundException("User not found"));
    Map<Long, User> usersById = Map.of(sender.getId(), sender, receiver.getId(), receiver);
    Map<Long, UserProfile> profilesByUserId = resolveProfiles(usersById.keySet());
    return toRequestItem(saved, receiver.getId(), usersById, profilesByUserId);
  }

  @Override
  @Transactional
  public FriendRequestItemDto rejectRequest(String authenticatedEmail, Long requestId) {
    User receiver = getAuthenticatedUser(authenticatedEmail);
    FriendRequest request =
        friendRequestRepository
            .findById(requestId)
            .orElseThrow(() -> new NotFoundException("Friend request not found"));

    if (!Objects.equals(request.getReceiverId(), receiver.getId())) {
      throw new UnauthorizedException("You are not allowed to reject this request");
    }
    if (!STATUS_PENDING.equals(request.getStatus())) {
      throw new ConflictException("Friend request is no longer pending");
    }

    request.setStatus(STATUS_REJECTED);
    request.setRespondedAt(Instant.now());
    FriendRequest saved = friendRequestRepository.save(request);

    User sender =
        userRepository
            .findById(request.getSenderId())
            .orElseThrow(() -> new NotFoundException("User not found"));
    Map<Long, User> usersById = Map.of(sender.getId(), sender, receiver.getId(), receiver);
    Map<Long, UserProfile> profilesByUserId = resolveProfiles(usersById.keySet());
    return toRequestItem(saved, receiver.getId(), usersById, profilesByUserId);
  }

  @Override
  @Transactional
  public void removeFriend(String authenticatedEmail, Long friendUserId) {
    User requester = getAuthenticatedUser(authenticatedEmail);
    if (friendUserId == null || friendUserId <= 0) {
      throw new IllegalArgumentException("friend user id is required");
    }
    if (Objects.equals(requester.getId(), friendUserId)) {
      throw new ConflictException("You cannot remove yourself");
    }

    Pair pair = normalizePair(requester.getId(), friendUserId);
    Friendship friendship =
        friendshipRepository
            .findByUserLowIdAndUserHighId(pair.low(), pair.high())
            .orElseThrow(() -> new NotFoundException("Friendship not found"));
    friendshipRepository.delete(friendship);

    List<FriendRequest> requests =
        friendRequestRepository.findBetweenUsers(requester.getId(), friendUserId);
    List<FriendRequest> updates = new ArrayList<>();
    Instant now = Instant.now();
    for (FriendRequest request : requests) {
      if (STATUS_PENDING.equals(request.getStatus())) {
        request.setStatus(STATUS_CANCELLED);
        request.setRespondedAt(now);
        updates.add(request);
      }
    }
    if (!updates.isEmpty()) {
      friendRequestRepository.saveAll(updates);
    }
  }

  @Override
  @Transactional(readOnly = true)
  public boolean areFriends(Long userIdA, Long userIdB) {
    if (userIdA == null || userIdB == null || Objects.equals(userIdA, userIdB)) {
      return false;
    }
    Pair pair = normalizePair(userIdA, userIdB);
    return friendshipRepository.existsByPair(pair.low(), pair.high());
  }

  private void createFriendshipIfMissing(Long userIdA, Long userIdB) {
    Pair pair = normalizePair(userIdA, userIdB);
    boolean exists = friendshipRepository.existsByPair(pair.low(), pair.high());
    if (exists) {
      return;
    }
    friendshipRepository.save(new Friendship(null, pair.low(), pair.high(), null));
  }

  private FriendRequestItemDto toRequestItem(
      FriendRequest request,
      Long requesterUserId,
      Map<Long, User> usersById,
      Map<Long, UserProfile> profilesByUserId) {
    boolean incoming = Objects.equals(request.getReceiverId(), requesterUserId);
    Long counterpartId = incoming ? request.getSenderId() : request.getReceiverId();
    User counterpart = usersById.get(counterpartId);
    FriendSummaryDto user =
        counterpart == null
            ? new FriendSummaryDto(counterpartId, "Unknown", null, null)
            : toFriendSummary(counterpart, profilesByUserId.get(counterpartId));
    return new FriendRequestItemDto(
        request.getId(),
        request.getStatus(),
        incoming ? "INCOMING" : "OUTGOING",
        user,
        request.getCreatedAt(),
        request.getRespondedAt());
  }

  private FriendSummaryDto toFriendSummary(User user, UserProfile profile) {
    return new FriendSummaryDto(
        user.getId(),
        user.getDisplayName(),
        user.getEmail(),
        profile == null ? null : profile.getAvatarUrl());
  }

  private Map<Long, UserProfile> resolveProfiles(Set<Long> userIds) {
    if (userIds == null || userIds.isEmpty()) {
      return Map.of();
    }
    Map<Long, UserProfile> profilesByUserId = new HashMap<>();
    userProfileRepository
        .findByUserIdIn(userIds)
        .forEach(profile -> profilesByUserId.put(profile.getUser().getId(), profile));
    return profilesByUserId;
  }

  private User getAuthenticatedUser(String authenticatedEmail) {
    return userRepository
        .findByEmail(normalizeEmail(authenticatedEmail))
        .orElseThrow(() -> new UnauthorizedException("User authentication is required"));
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
  }

  private Pair normalizePair(Long userIdA, Long userIdB) {
    long low = Math.min(userIdA, userIdB);
    long high = Math.max(userIdA, userIdB);
    return new Pair(low, high);
  }

  private record Pair(Long low, Long high) {}
}
