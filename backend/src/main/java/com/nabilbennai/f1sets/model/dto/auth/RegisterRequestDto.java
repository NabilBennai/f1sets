package com.nabilbennai.f1sets.model.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequestDto(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    @NotBlank @Size(min = 2, max = 100) @Pattern(
            regexp = "^[\\p{L}\\p{N} .'-]+$",
            message = "displayName contains unsupported characters")
        String displayName) {}
