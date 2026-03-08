package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.ChatMessage;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

  @Query(
      """
          select cm
          from ChatMessage cm
          where (cm.senderId = :userA and cm.recipientId = :userB)
             or (cm.senderId = :userB and cm.recipientId = :userA)
          order by cm.createdAt desc, cm.id desc
          """)
  List<ChatMessage> findConversation(
      @Param("userA") Long userA, @Param("userB") Long userB, Pageable pageable);

  @Modifying
  @Query(
      """
          update ChatMessage cm
             set cm.readAt = :readAt
           where cm.senderId = :friendId
             and cm.recipientId = :readerId
             and cm.readAt is null
          """)
  int markConversationAsRead(
      @Param("readerId") Long readerId,
      @Param("friendId") Long friendId,
      @Param("readAt") Instant readAt);
}
