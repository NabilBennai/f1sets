package com.nabilbennai.f1sets.model.entities;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(
    name = "ai_difficulty_curves",
    uniqueConstraints = @UniqueConstraint(columnNames = {"game_id", "track_id"}))
@Data
public class AiDifficultyCurve {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "game_id", nullable = false)
  private Long gameId;

  @Column(name = "track_id", nullable = false)
  private Long trackId;

  private Integer version;
}
