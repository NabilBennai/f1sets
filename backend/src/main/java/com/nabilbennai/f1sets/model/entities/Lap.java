package com.nabilbennai.f1sets.model.entities;

import com.nabilbennai.f1sets.model.enums.SessionType;
import com.nabilbennai.f1sets.model.enums.Visibility;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@Table(name = "laps")
public class Lap {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  private Game game;

  @ManyToOne(fetch = FetchType.LAZY)
  private Track track;

  @Enumerated(EnumType.STRING)
  private SessionType sessionType;

  private boolean isValid;

  @Enumerated(EnumType.STRING)
  private Visibility visibility;

  private LocalDateTime deletedAt;
}
