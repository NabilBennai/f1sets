package com.nabilbennai.f1sets.model.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "app_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AppLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false, length = 16)
  private String level;

  @Column(name = "http_method", nullable = false, length = 10)
  private String httpMethod;

  @Column(nullable = false, length = 255)
  private String path;

  @Column(name = "query_string", length = 1024)
  private String queryString;

  @Column(name = "status_code", nullable = false)
  private Integer statusCode;

  @Column(name = "duration_ms", nullable = false)
  private Long durationMs;

  @Column(name = "user_email", length = 255)
  private String userEmail;

  @Column(name = "user_role", length = 32)
  private String userRole;

  @Column(name = "client_ip", length = 64)
  private String clientIp;

  @Column(name = "user_agent", length = 512)
  private String userAgent;

  @Column(length = 512)
  private String message;

  @Column(name = "request_payload_json", columnDefinition = "LONGTEXT")
  private String requestPayloadJson;

  @Column(name = "response_body_json", columnDefinition = "LONGTEXT")
  private String responseBodyJson;

  @PrePersist
  void onCreate() {
    if (this.createdAt == null) {
      this.createdAt = Instant.now();
    }
  }
}
