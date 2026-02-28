package com.nabilbennai.f1sets.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.nabilbennai.f1sets.model.entities.User;
import com.nabilbennai.f1sets.model.enums.UserRole;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

class JwtServiceTest {

  private JwtService jwtService;

  @BeforeEach
  void setUp() {
    jwtService = new JwtService();
    String secret =
        Base64.getEncoder()
            .encodeToString("0123456789abcdef0123456789abcdef".getBytes(StandardCharsets.UTF_8));
    ReflectionTestUtils.setField(jwtService, "jwtSecret", secret);
    ReflectionTestUtils.setField(jwtService, "jwtExpirationSeconds", 3600L);
    ReflectionTestUtils.invokeMethod(jwtService, "init");
  }

  @Test
  void generateTokenAllowsExtractingUsernameAndValidatesAgainstSameUser() {
    User domainUser = buildDomainUser(42L, "driver@f1sets.local");
    UserDetails userDetails =
        org.springframework.security.core.userdetails.User.withUsername("driver@f1sets.local")
            .password("x")
            .authorities("ROLE_USER")
            .build();

    String token = jwtService.generateToken(domainUser);

    assertNotNull(token);
    assertEquals("driver@f1sets.local", jwtService.extractUsername(token));
    assertTrue(jwtService.isTokenValid(token, userDetails));
  }

  @Test
  void tokenIsInvalidForDifferentUserDetails() {
    User domainUser = buildDomainUser(42L, "driver@f1sets.local");
    UserDetails otherUser =
        org.springframework.security.core.userdetails.User.withUsername("other@f1sets.local")
            .password("x")
            .authorities("ROLE_USER")
            .build();
    String token = jwtService.generateToken(domainUser);

    assertFalse(jwtService.isTokenValid(token, otherUser));
  }

  @Test
  void expiredTokenIsRejected() {
    ReflectionTestUtils.setField(jwtService, "jwtExpirationSeconds", -1L);
    User domainUser = buildDomainUser(42L, "driver@f1sets.local");

    String token = jwtService.generateToken(domainUser);

    assertThrows(ExpiredJwtException.class, () -> jwtService.extractUsername(token));
  }

  @Test
  void tamperedTokenThrowsJwtExceptionOnExtract() {
    User domainUser = buildDomainUser(42L, "driver@f1sets.local");
    String token = jwtService.generateToken(domainUser);
    String tamperedToken = token.substring(0, token.length() - 2) + "aa";

    assertThrows(JwtException.class, () -> jwtService.extractUsername(tamperedToken));
  }

  private static User buildDomainUser(Long id, String email) {
    User user = new User();
    user.setId(id);
    user.setEmail(email);
    user.setDisplayName("Driver");
    user.setPasswordHash("hash");
    user.setRole(UserRole.USER);
    user.setEnabled(true);
    return user;
  }
}
