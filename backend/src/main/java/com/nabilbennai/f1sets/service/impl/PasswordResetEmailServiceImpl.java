package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.service.PasswordResetEmailService;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PasswordResetEmailServiceImpl implements PasswordResetEmailService {

  private final JavaMailSender mailSender;

  @Value("${app.mail.from:no-reply@f1sets.local}")
  private String senderAddress;

  @Override
  public void sendPasswordResetEmail(
      String recipientEmail, String recipientName, String resetLink, Instant expiresAt) {
    String safeName =
        (recipientName == null || recipientName.isBlank()) ? "driver" : recipientName.trim();
    String expiresAtUtc = DateTimeFormatter.ISO_INSTANT.format(expiresAt.atOffset(ZoneOffset.UTC));

    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(senderAddress);
    message.setTo(recipientEmail);
    message.setSubject("Reset your F1 Sets password");
    message.setText(
        """
                Hello %s,

                We received a request to reset your F1 Sets password.
                Use this secure link to continue:
                %s

                This link expires at %s.
                If you did not request a reset, you can safely ignore this email.
                """
            .formatted(safeName, resetLink, expiresAtUtc));

    mailSender.send(message);
  }
}
