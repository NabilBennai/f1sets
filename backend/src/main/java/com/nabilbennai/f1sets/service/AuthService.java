package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.auth.*;

public interface AuthService {

  AuthResponseDto register(RegisterRequestDto request);

  AuthResponseDto login(LoginRequestDto request);

  MessageResponseDto forgotPassword(ForgotPasswordRequestDto request);

  MessageResponseDto resetPassword(ResetPasswordRequestDto request);

  MessageResponseDto changePassword(String authenticatedEmail, ChangePasswordRequestDto request);

  AuthUserDto me(String authenticatedEmail);
}
