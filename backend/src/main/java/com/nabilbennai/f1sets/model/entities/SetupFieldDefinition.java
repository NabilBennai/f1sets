package com.nabilbennai.f1sets.model.entities;

import com.nabilbennai.f1sets.model.enums.SetupFieldType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
    name = "setup_field_definitions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"game_id", "field_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SetupFieldDefinition {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "game_id", nullable = false)
  private Game game;

  @Column(name = "field_key", nullable = false, length = 80)
  private String fieldKey;

  @Column(name = "field_label", nullable = false, length = 120)
  private String fieldLabel;

  @Enumerated(EnumType.STRING)
  @Column(name = "field_type", nullable = false, length = 20)
  private SetupFieldType fieldType;

  @Column(name = "is_required", nullable = false)
  private boolean required;

  @Column(name = "select_options_json", columnDefinition = "json")
  private String selectOptionsJson;

  @Column(name = "sort_order", nullable = false)
  private int sortOrder = 0;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
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
