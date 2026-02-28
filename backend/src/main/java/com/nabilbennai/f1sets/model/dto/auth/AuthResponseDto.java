package com.nabilbennai.f1sets.model.dto.auth;

public record AuthResponseDto(
    String accessToken, String tokenType, long expiresIn, AuthUserDto user) {}
