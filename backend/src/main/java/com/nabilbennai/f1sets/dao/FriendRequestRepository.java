package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.FriendRequest;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

  Optional<FriendRequest> findBySenderIdAndReceiverId(Long senderId, Long receiverId);

  List<FriendRequest> findByReceiverIdAndStatusOrderByCreatedAtDesc(Long receiverId, String status);

  List<FriendRequest> findBySenderIdAndStatusOrderByCreatedAtDesc(Long senderId, String status);

  @Query(
      """
          select fr
          from FriendRequest fr
          where (fr.senderId = :userA and fr.receiverId = :userB)
             or (fr.senderId = :userB and fr.receiverId = :userA)
          order by fr.updatedAt desc
          """)
  List<FriendRequest> findBetweenUsers(@Param("userA") Long userA, @Param("userB") Long userB);
}
