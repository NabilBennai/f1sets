package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.PasswordResetToken;
import com.nabilbennai.f1sets.model.entities.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

  Optional<PasswordResetToken> findByTokenHash(String tokenHash);

  @Modifying
  @Query(
      """
            update PasswordResetToken token
            set token.usedAt = :usedAt
            where token.user = :user and token.usedAt is null
            """)
  void markAllActiveTokensUsed(@Param("user") User user, @Param("usedAt") java.time.Instant usedAt);
}
