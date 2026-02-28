package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.Setup;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SetupRepository extends JpaRepository<Setup, Long> {

  boolean existsByGameIdAndTrackIdAndDeletedAtIsNull(Long gameId, Long trackId);

  List<Setup> findByGameIdAndTrackIdAndDeletedAtIsNullOrderByCreatedAtDesc(
      Long gameId, Long trackId, Pageable pageable);

  List<Setup> findByUserIdAndDeletedAtIsNullAndHiddenFalseOrderByCreatedAtDesc(
      Long userId, Pageable pageable);

  Optional<Setup> findByIdAndDeletedAtIsNull(Long id);

  @Query(
      """
            select s
            from Setup s, Game g, Track t
            where s.deletedAt is null
              and s.hidden = false
              and g.id = s.gameId
              and t.id = s.trackId
              and (:gameCode is null or lower(g.code) = :gameCode)
              and (:trackSlug is null or lower(t.slug) = :trackSlug)
              and (:query is null or (
                    lower(coalesce(s.title, '')) like concat('%', :query, '%')
                    or lower(coalesce(s.notes, '')) like concat('%', :query, '%')
                  ))
              and (:sessionType is null or lower(coalesce(s.sessionType, '')) = :sessionType)
              and (:weatherCondition is null or lower(coalesce(s.weatherCondition, '')) = :weatherCondition)
              and (:inputDevice is null or lower(coalesce(s.inputDevice, '')) = :inputDevice)
            """)
  Page<Setup> searchActiveSetups(
      @Param("gameCode") String gameCode,
      @Param("trackSlug") String trackSlug,
      @Param("query") String query,
      @Param("sessionType") String sessionType,
      @Param("weatherCondition") String weatherCondition,
      @Param("inputDevice") String inputDevice,
      Pageable pageable);
}
