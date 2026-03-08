package com.nabilbennai.f1sets.model.dto.friends;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateFriendRequestDto(@NotNull @Min(1) Long userId) {}
