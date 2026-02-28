package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.dao.projections.SetupVoteStatsProjection;
import com.nabilbennai.f1sets.model.entities.SetupVote;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SetupVoteRepository extends JpaRepository<SetupVote, Long> {

  Optional<SetupVote> findBySetupIdAndUserId(Long setupId, Long userId);

  List<SetupVote> findByUserIdAndSetupIdIn(Long userId, Collection<Long> setupIds);

  @Query(
      """
      select v.setupId as setupId,
             sum(case when v.voteValue > 0 then 1 else 0 end) as upvotes,
             sum(case when v.voteValue < 0 then 1 else 0 end) as downvotes,
             sum(v.voteValue) as score
      from SetupVote v
      where v.setupId in :setupIds
      group by v.setupId
      """)
  List<SetupVoteStatsProjection> findVoteStatsBySetupIds(
      @Param("setupIds") Collection<Long> setupIds);
}
