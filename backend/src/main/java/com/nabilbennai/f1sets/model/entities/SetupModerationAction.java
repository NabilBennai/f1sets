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
@Table(name = "setup_moderation_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SetupModerationAction {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "setup_id", nullable = false)
  private Long setupId;

  @Column(name = "admin_user_id", nullable = false)
  private Long adminUserId;

  @Column(name = "action_type", nullable = false, length = 24)
  private String actionType;

  @Column(name = "reason", length = 255)
  private String reason;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @PrePersist
  void onCreate() {
    this.createdAt = Instant.now();
  }
}
