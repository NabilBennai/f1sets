package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByEmail(String email);

  boolean existsByEmail(String email);

  @Query(
      """
          select u
          from User u
          where lower(u.email) like concat('%', :term, '%')
             or lower(u.displayName) like concat('%', :term, '%')
          order by u.displayName asc, u.email asc
          """)
  List<User> searchByTerm(@Param("term") String term);
}
