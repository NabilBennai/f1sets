package com.nabilbennai.f1sets.model.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequestDto(
    @NotBlank String token, @NotBlank @Size(min = 8, max = 72) String newPassword) {}
