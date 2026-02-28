package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.config.JwtService;
import com.nabilbennai.f1sets.dao.PasswordResetTokenRepository;
import com.nabilbennai.f1sets.dao.UserRepository;
import com.nabilbennai.f1sets.miscellaneous.ConflictException;
import com.nabilbennai.f1sets.miscellaneous.UnauthorizedException;
import com.nabilbennai.f1sets.model.dto.auth.*;
import com.nabilbennai.f1sets.model.entities.PasswordResetToken;
import com.nabilbennai.f1sets.model.entities.User;
import com.nabilbennai.f1sets.model.enums.UserRole;
import com.nabilbennai.f1sets.service.AuthService;
import com.nabilbennai.f1sets.service.PasswordResetEmailService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

  private static final String GENERIC_RESET_MESSAGE =
      "If the email exists, a reset link has been sent.";

  private final UserRepository userRepository;
  private final PasswordResetTokenRepository passwordResetTokenRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final PasswordResetEmailService passwordResetEmailService;
  private final SecureRandom secureRandom = new SecureRandom();

  @Value("${app.password-reset.expiration}")
  private long passwordResetExpirationSeconds;

  @Value("${app.frontend-url}")
  private String frontendUrl;

  @Override
  @Transactional
  public AuthResponseDto register(RegisterRequestDto request) {
    String normalizedEmail = normalizeEmail(request.email());
    if (userRepository.existsByEmail(normalizedEmail)) {
      throw new ConflictException("Email is already registered");
    }

    User user = new User();
    user.setEmail(normalizedEmail);
    user.setDisplayName(request.displayName().trim());
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setEnabled(true);
    user.setRole(UserRole.USER);

    User saved = userRepository.save(user);
    return buildAuthResponse(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public AuthResponseDto login(LoginRequestDto request) {
    String normalizedEmail = normalizeEmail(request.email());
    User user =
        userRepository
            .findByEmail(normalizedEmail)
            .orElseThrow(() -> new UnauthorizedException("Invalid credentials"));

    if (!user.isEnabled() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return buildAuthResponse(user);
  }

  @Override
  @Transactional
  public MessageResponseDto forgotPassword(ForgotPasswordRequestDto request) {
    String normalizedEmail = normalizeEmail(request.email());
    User user = userRepository.findByEmail(normalizedEmail).orElse(null);
    if (user == null) {
      return new MessageResponseDto(GENERIC_RESET_MESSAGE);
    }

    Instant now = Instant.now();
    String rawToken = generateRawToken();
    String tokenHash = sha256Hex(rawToken);
    Instant expiresAt = now.plusSeconds(passwordResetExpirationSeconds);

    PasswordResetToken resetToken = new PasswordResetToken();
    resetToken.setUser(user);
    resetToken.setTokenHash(tokenHash);
    resetToken.setExpiresAt(expiresAt);
    resetToken.setUsedAt(null);
    passwordResetTokenRepository.save(resetToken);

    String resetLink =
        UriComponentsBuilder.fromUriString(frontendUrl)
            .path("/auth/reset-password")
            .queryParam("token", rawToken)
            .build()
            .toUriString();

    try {
      passwordResetEmailService.sendPasswordResetEmail(
          user.getEmail(), user.getDisplayName(), resetLink, expiresAt);
    } catch (MailException exception) {
      throw new IllegalStateException("Unable to send reset email right now");
    }

    return new MessageResponseDto(GENERIC_RESET_MESSAGE);
  }

  @Override
  @Transactional
  public MessageResponseDto resetPassword(ResetPasswordRequestDto request) {
    String tokenHash = sha256Hex(request.token());
    PasswordResetToken resetToken =
        passwordResetTokenRepository
            .findByTokenHash(tokenHash)
            .orElseThrow(() -> new IllegalArgumentException("Invalid or expired reset token"));

    Instant now = Instant.now();
    if (resetToken.getUsedAt() != null || resetToken.getExpiresAt().isBefore(now)) {
      throw new IllegalArgumentException("Invalid or expired reset token");
    }

    User user = resetToken.getUser();
    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    userRepository.save(user);

    passwordResetTokenRepository.markAllActiveTokensUsed(user, now);
    return new MessageResponseDto("Password has been reset successfully.");
  }

  @Override
  @Transactional
  public MessageResponseDto changePassword(
      String authenticatedEmail, ChangePasswordRequestDto request) {
    User user = findByEmailOrThrow(authenticatedEmail);

    if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
      throw new IllegalArgumentException(
          "New password must be different from the current password");
    }

    user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    userRepository.save(user);
    passwordResetTokenRepository.markAllActiveTokensUsed(user, Instant.now());

    return new MessageResponseDto("Password has been changed successfully.");
  }

  @Override
  @Transactional(readOnly = true)
  public AuthUserDto me(String authenticatedEmail) {
    User user = findByEmailOrThrow(authenticatedEmail);
    return new AuthUserDto(
        user.getId(), user.getEmail(), user.getDisplayName(), user.getRole().name());
  }

  private AuthResponseDto buildAuthResponse(User user) {
    String token = jwtService.generateToken(user);
    AuthUserDto userDto =
        new AuthUserDto(
            user.getId(), user.getEmail(), user.getDisplayName(), user.getRole().name());
    return new AuthResponseDto(token, "Bearer", jwtService.getJwtExpirationSeconds(), userDto);
  }

  private User findByEmailOrThrow(String email) {
    return userRepository
        .findByEmail(normalizeEmail(email))
        .orElseThrow(() -> new UnauthorizedException("User authentication is required"));
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase();
  }

  private String generateRawToken() {
    byte[] tokenBytes = new byte[32];
    secureRandom.nextBytes(tokenBytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
  }

  private String sha256Hex(String rawValue) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashed = digest.digest(rawValue.getBytes(StandardCharsets.UTF_8));
      return HexFormat.of().formatHex(hashed);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 algorithm is not available", exception);
    }
  }
}
