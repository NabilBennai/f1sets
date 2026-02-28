package com.nabilbennai.f1sets.model.entities;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "setups")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Setup {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "game_id", nullable = false)
  private Long gameId;

  @Column(name = "track_id", nullable = false)
  private Long trackId;

  @Column(name = "user_id")
  private Long userId;

  @Column(length = 120)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(name = "setup_data", columnDefinition = "json")
  private String setupData;

  @Column(name = "session_type", length = 32)
  private String sessionType;

  @Column(name = "weather_condition", length = 32)
  private String weatherCondition;

  @Column(name = "assists_preset", length = 32)
  private String assistsPreset;

  @Column(name = "input_device", length = 32)
  private String inputDevice;

  @Column(name = "fuel_load_kg")
  private Double fuelLoadKg;

  @Column(name = "tyre_compound", length = 32)
  private String tyreCompound;

  @Column(name = "is_hidden", nullable = false)
  private boolean hidden;

  @Column(name = "hidden_reason", length = 255)
  private String hiddenReason;

  @Column(name = "hidden_at")
  private Instant hiddenAt;

  @Column(name = "hidden_by_user_id")
  private Long hiddenByUserId;

  private Instant deletedAt;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  @Column(nullable = false)
  private Instant updatedAt;

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @PreUpdate
  void onUpdate() {
    this.updatedAt = Instant.now();
  }
}
