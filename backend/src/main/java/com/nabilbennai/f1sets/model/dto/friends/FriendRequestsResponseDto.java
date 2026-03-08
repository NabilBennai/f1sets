package com.nabilbennai.f1sets.model.dto.friends;

import java.util.List;

public record FriendRequestsResponseDto(
    List<FriendRequestItemDto> incoming, List<FriendRequestItemDto> outgoing) {}
