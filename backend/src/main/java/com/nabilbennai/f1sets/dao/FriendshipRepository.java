package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.Friendship;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

  Optional<Friendship> findByUserLowIdAndUserHighId(Long userLowId, Long userHighId);

  @Query(
      """
          select f
          from Friendship f
          where f.userLowId = :userId or f.userHighId = :userId
          order by f.createdAt desc
          """)
  List<Friendship> findAllByUserId(@Param("userId") Long userId);

  @Query(
      """
          select case when count(f) > 0 then true else false end
          from Friendship f
          where f.userLowId = :userLowId and f.userHighId = :userHighId
          """)
  boolean existsByPair(@Param("userLowId") Long userLowId, @Param("userHighId") Long userHighId);
}
