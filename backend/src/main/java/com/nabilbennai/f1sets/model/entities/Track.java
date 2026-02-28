package com.nabilbennai.f1sets.model.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Table(name = "tracks", uniqueConstraints = @UniqueConstraint(columnNames = {"game_id", "slug"}))
public class Track {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "game_id", nullable = false)
  private Game game;

  @Column(nullable = false)
  private String slug;

  private String grandPrixName;
  private String circuitName;

  @Column(precision = 6, scale = 3)
  private BigDecimal lengthKm;

  private String trackImageUrl;
}
