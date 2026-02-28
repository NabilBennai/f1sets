package com.nabilbennai.f1sets.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nabilbennai.f1sets.config.JwtService;
import com.nabilbennai.f1sets.dao.PasswordResetTokenRepository;
import com.nabilbennai.f1sets.dao.UserRepository;
import com.nabilbennai.f1sets.miscellaneous.ConflictException;
import com.nabilbennai.f1sets.miscellaneous.UnauthorizedException;
import com.nabilbennai.f1sets.model.dto.auth.ChangePasswordRequestDto;
import com.nabilbennai.f1sets.model.dto.auth.ForgotPasswordRequestDto;
import com.nabilbennai.f1sets.model.dto.auth.MessageResponseDto;
import com.nabilbennai.f1sets.model.dto.auth.RegisterRequestDto;
import com.nabilbennai.f1sets.model.dto.auth.ResetPasswordRequestDto;
import com.nabilbennai.f1sets.model.entities.PasswordResetToken;
import com.nabilbennai.f1sets.model.entities.User;
import com.nabilbennai.f1sets.model.enums.UserRole;
import com.nabilbennai.f1sets.service.PasswordResetEmailService;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

  @Mock private UserRepository userRepository;
  @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
  @Mock private PasswordEncoder passwordEncoder;
  @Mock private JwtService jwtService;
  @Mock private PasswordResetEmailService passwordResetEmailService;

  @InjectMocks private AuthServiceImpl authService;

  @BeforeEach
  void setUp() {
    ReflectionTestUtils.setField(authService, "passwordResetExpirationSeconds", 3600L);
    ReflectionTestUtils.setField(authService, "frontendUrl", "http://localhost:4200");
  }

  @Test
  void registerThrowsConflictWhenEmailAlreadyExists() {
    RegisterRequestDto request = new RegisterRequestDto("USER@MAIL.COM", "password123", "Driver");
    when(userRepository.existsByEmail("user@mail.com")).thenReturn(true);

    assertThrows(ConflictException.class, () -> authService.register(request));

    verify(userRepository, never()).save(any(User.class));
  }

  @Test
  void forgotPasswordReturnsGenericMessageWhenEmailDoesNotExist() {
    when(userRepository.findByEmail("missing@f1sets.local")).thenReturn(Optional.empty());

    MessageResponseDto response =
        authService.forgotPassword(new ForgotPasswordRequestDto("missing@f1sets.local"));

    assertEquals("If the email exists, a reset link has been sent.", response.message());
    verify(passwordResetTokenRepository, never()).save(any(PasswordResetToken.class));
    verify(passwordResetEmailService, never())
        .sendPasswordResetEmail(anyString(), anyString(), anyString(), any(Instant.class));
  }

  @Test
  void forgotPasswordPersistsHashedTokenAndSendsEmailLink() {
    User user = buildUser(7L, "racer@f1sets.local", "Racer", "hash-1");
    when(userRepository.findByEmail("racer@f1sets.local")).thenReturn(Optional.of(user));

    MessageResponseDto response =
        authService.forgotPassword(new ForgotPasswordRequestDto("racer@f1sets.local"));

    assertEquals("If the email exists, a reset link has been sent.", response.message());

    ArgumentCaptor<PasswordResetToken> tokenCaptor =
        ArgumentCaptor.forClass(PasswordResetToken.class);
    verify(passwordResetTokenRepository).save(tokenCaptor.capture());
    PasswordResetToken savedToken = tokenCaptor.getValue();
    assertEquals(user, savedToken.getUser());
    assertNotNull(savedToken.getExpiresAt());
    assertNotNull(savedToken.getTokenHash());
    assertEquals(64, savedToken.getTokenHash().length());

    ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
    verify(passwordResetEmailService)
        .sendPasswordResetEmail(anyString(), anyString(), linkCaptor.capture(), any(Instant.class));
    String resetLink = linkCaptor.getValue();
    assertTrue(resetLink.startsWith("http://localhost:4200/auth/reset-password?token="));
    assertTrue(!resetLink.endsWith(savedToken.getTokenHash()));
  }

  @Test
  void forgotPasswordThrowsWhenEmailDeliveryFails() {
    User user = buildUser(11L, "mailfail@f1sets.local", "Fail", "hash-1");
    when(userRepository.findByEmail("mailfail@f1sets.local")).thenReturn(Optional.of(user));
    doThrow(new MailSendException("smtp down"))
        .when(passwordResetEmailService)
        .sendPasswordResetEmail(anyString(), anyString(), anyString(), any(Instant.class));

    assertThrows(
        IllegalStateException.class,
        () -> authService.forgotPassword(new ForgotPasswordRequestDto("mailfail@f1sets.local")));
  }

  @Test
  void resetPasswordRejectsExpiredOrUsedToken() {
    User user = buildUser(3L, "driver@f1sets.local", "Driver", "old-hash");
    PasswordResetToken expired = new PasswordResetToken();
    expired.setUser(user);
    expired.setTokenHash("h");
    expired.setExpiresAt(Instant.now().minusSeconds(5));
    expired.setUsedAt(null);
    when(passwordResetTokenRepository.findByTokenHash(anyString()))
        .thenReturn(Optional.of(expired));

    assertThrows(
        IllegalArgumentException.class,
        () -> authService.resetPassword(new ResetPasswordRequestDto("raw-token", "newPass123")));

    verify(userRepository, never()).save(any(User.class));
  }

  @Test
  void changePasswordUpdatesPasswordAndRevokesAllResetTokens() {
    User user = buildUser(9L, "user@f1sets.local", "User", "encoded-old");
    when(userRepository.findByEmail("user@f1sets.local")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("current-pass", "encoded-old")).thenReturn(true);
    when(passwordEncoder.matches("next-pass-123", "encoded-old")).thenReturn(false);
    when(passwordEncoder.encode("next-pass-123")).thenReturn("encoded-new");

    MessageResponseDto response =
        authService.changePassword(
            "user@f1sets.local", new ChangePasswordRequestDto("current-pass", "next-pass-123"));

    assertEquals("Password has been changed successfully.", response.message());
    verify(userRepository).save(user);
    verify(passwordResetTokenRepository)
        .markAllActiveTokensUsed(any(User.class), any(Instant.class));
    assertEquals("encoded-new", user.getPasswordHash());
  }

  @Test
  void changePasswordRejectsWrongCurrentPassword() {
    User user = buildUser(5L, "user@f1sets.local", "User", "encoded-old");
    when(userRepository.findByEmail("user@f1sets.local")).thenReturn(Optional.of(user));
    when(passwordEncoder.matches("wrong-current", "encoded-old")).thenReturn(false);

    assertThrows(
        UnauthorizedException.class,
        () ->
            authService.changePassword(
                "user@f1sets.local", new ChangePasswordRequestDto("wrong-current", "new-pass-1")));

    verify(userRepository, never()).save(any(User.class));
  }

  private static User buildUser(Long id, String email, String name, String passwordHash) {
    User user = new User();
    user.setId(id);
    user.setEmail(email);
    user.setDisplayName(name);
    user.setPasswordHash(passwordHash);
    user.setRole(UserRole.USER);
    user.setEnabled(true);
    return user;
  }
}
