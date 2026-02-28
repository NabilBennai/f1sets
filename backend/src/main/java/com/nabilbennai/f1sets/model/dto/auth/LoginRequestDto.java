package com.nabilbennai.f1sets.model.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequestDto(
    @NotBlank @Email String email, @NotBlank @Size(min = 8, max = 72) String password) {}
