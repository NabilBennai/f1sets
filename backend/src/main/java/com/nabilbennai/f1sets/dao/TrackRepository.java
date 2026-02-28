package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.Game;
import com.nabilbennai.f1sets.model.entities.Track;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface TrackRepository extends JpaRepository<Track, Long> {

  @Query(
      """
                select t from Track t
                where t.game = :game
                order by t.grandPrixName asc
            """)
  List<Track> findAllByGameOrderByName(@Param("game") Game game);

  boolean existsByGameAndSlug(Game game, String slug);

  Optional<Track> findByGameAndSlug(Game game, String slug);
}
