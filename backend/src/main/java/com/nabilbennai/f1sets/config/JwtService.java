package com.nabilbennai.f1sets.config;

import com.nabilbennai.f1sets.model.entities.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.security.Key;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  @Value("${app.jwt.secret}")
  private String jwtSecret;

  @Value("${app.jwt.expiration}")
  private long jwtExpirationSeconds;

  private Key signingKey;

  @PostConstruct
  void init() {
    byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
    this.signingKey = Keys.hmacShaKeyFor(keyBytes);
  }

  public String generateToken(User user) {
    Map<String, Object> claims = new HashMap<>();
    claims.put("uid", user.getId());
    claims.put("name", user.getDisplayName());
    return buildToken(claims, user.getEmail());
  }

  public String extractUsername(String token) {
    return extractAllClaims(token).getSubject();
  }

  public boolean isTokenValid(String token, UserDetails userDetails) {
    String username = extractUsername(token);
    return username.equalsIgnoreCase(userDetails.getUsername()) && !isTokenExpired(token);
  }

  public long getJwtExpirationSeconds() {
    return jwtExpirationSeconds;
  }

  private String buildToken(Map<String, Object> claims, String subject) {
    Instant now = Instant.now();
    Instant expiration = now.plusSeconds(jwtExpirationSeconds);

    return Jwts.builder()
        .claims(claims)
        .subject(subject)
        .issuedAt(Date.from(now))
        .expiration(Date.from(expiration))
        .signWith(signingKey)
        .compact();
  }

  private boolean isTokenExpired(String token) {
    return extractAllClaims(token).getExpiration().before(new Date());
  }

  private Claims extractAllClaims(String token) {
    return Jwts.parser()
        .verifyWith((SecretKey) signingKey)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
