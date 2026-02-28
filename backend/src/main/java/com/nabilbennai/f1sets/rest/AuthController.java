package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.auth.*;
import com.nabilbennai.f1sets.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @PostMapping("/register")
  public ResponseEntity<AuthResponseDto> register(@Valid @RequestBody RegisterRequestDto request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
  }

  @PostMapping("/login")
  public ResponseEntity<AuthResponseDto> login(@Valid @RequestBody LoginRequestDto request) {
    return ResponseEntity.ok(authService.login(request));
  }

  @PostMapping("/forgot-password")
  public ResponseEntity<MessageResponseDto> forgotPassword(
      @Valid @RequestBody ForgotPasswordRequestDto request) {
    return ResponseEntity.ok(authService.forgotPassword(request));
  }

  @PostMapping("/reset-password")
  public ResponseEntity<MessageResponseDto> resetPassword(
      @Valid @RequestBody ResetPasswordRequestDto request) {
    return ResponseEntity.ok(authService.resetPassword(request));
  }

  @PostMapping("/change-password")
  public ResponseEntity<MessageResponseDto> changePassword(
      Authentication authentication, @Valid @RequestBody ChangePasswordRequestDto request) {
    return ResponseEntity.ok(authService.changePassword(authentication.getName(), request));
  }

  @GetMapping("/me")
  public ResponseEntity<AuthUserDto> me(Authentication authentication) {
    return ResponseEntity.ok(authService.me(authentication.getName()));
  }
}
