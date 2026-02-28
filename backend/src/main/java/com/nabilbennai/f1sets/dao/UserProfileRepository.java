package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.User;
import com.nabilbennai.f1sets.model.entities.UserProfile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

  Optional<UserProfile> findByUser(User user);

  Optional<UserProfile> findByUserId(Long userId);
}
