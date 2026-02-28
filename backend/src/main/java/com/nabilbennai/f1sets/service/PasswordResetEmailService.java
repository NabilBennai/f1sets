package com.nabilbennai.f1sets.service;

import java.time.Instant;

public interface PasswordResetEmailService {

  void sendPasswordResetEmail(
      String recipientEmail, String recipientName, String resetLink, Instant expiresAt);
}
