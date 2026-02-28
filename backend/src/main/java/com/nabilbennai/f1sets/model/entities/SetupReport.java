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
@Table(name = "setup_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SetupReport {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "setup_id", nullable = false)
  private Long setupId;

  @Column(name = "reporter_id", nullable = false)
  private Long reporterId;

  @Column(name = "reason", nullable = false, length = 255)
  private String reason;

  @Column(name = "status", nullable = false, length = 16)
  private String status;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "resolved_at")
  private Instant resolvedAt;

  @Column(name = "resolved_by")
  private Long resolvedBy;

  @PrePersist
  void onCreate() {
    this.createdAt = Instant.now();
    if (this.status == null) {
      this.status = "OPEN";
    }
  }
}
