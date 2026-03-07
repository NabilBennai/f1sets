package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.AiDifficultyCurve;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiDifficultyCurveRepository extends JpaRepository<AiDifficultyCurve, Long> {

  boolean existsByGameIdAndTrackId(Long gameId, Long trackId);

  Optional<AiDifficultyCurve> findByGameIdAndTrackId(Long gameId, Long trackId);
}
