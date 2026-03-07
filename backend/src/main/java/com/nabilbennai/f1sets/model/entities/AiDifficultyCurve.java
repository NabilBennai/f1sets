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

  @Column(nullable = false)
  private Double slope;

  @Column(nullable = false)
  private Double intercept;

  @Column(name = "esports_ref_time_ms")
  private Integer esportsRefTimeMs;

  @Column(name = "avg_ref_time_ms")
  private Integer avgRefTimeMs;

  @Column(length = 255)
  private String source;

  private Integer version;
}
