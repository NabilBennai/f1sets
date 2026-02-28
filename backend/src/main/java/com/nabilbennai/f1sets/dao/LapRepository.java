package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.Lap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface LapRepository extends JpaRepository<Lap, Long> {

  @Query(
      """
                select count(l) > 0
                from Lap l
                where l.game.id = :gameId
                  and l.track.id = :trackId
                  and l.sessionType = 'TIME_TRIAL'
                  and l.isValid = true
                  and l.deletedAt is null
                  and l.visibility = 'PUBLIC'
            """)
  boolean existsValidTimeTrialLap(Long gameId, Long trackId);
}
