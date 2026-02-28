package com.nabilbennai.f1sets.model.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequestDto(
    @NotBlank @Size(min = 8, max = 72) String currentPassword,
    @NotBlank @Size(min = 8, max = 72) String newPassword) {}
