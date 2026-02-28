package com.nabilbennai.f1sets.model.entities;

import com.nabilbennai.f1sets.model.enums.Visibility;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "user_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserProfile {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false, unique = true)
  private User user;

  @Column(name = "first_name", length = 100)
  private String firstName;

  @Column(name = "last_name", length = 100)
  private String lastName;

  @Column(name = "date_of_birth")
  private LocalDate dateOfBirth;

  @Column(length = 100)
  private String country;

  @Column(length = 255)
  private String languages;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Visibility visibility = Visibility.PRIVATE;

  @Column(name = "avatar_url", length = 1024)
  private String avatarUrl;

  @Column(name = "avatar_object_key", length = 255)
  private String avatarObjectKey;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

  @PrePersist
  void onCreate() {
    Instant now = Instant.now();
    this.createdAt = now;
    this.updatedAt = now;
    if (this.visibility == null) {
      this.visibility = Visibility.PRIVATE;
    }
  }

  @PreUpdate
  void onUpdate() {
    this.updatedAt = Instant.now();
  }
}
