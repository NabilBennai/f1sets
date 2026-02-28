package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.Game;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {

  Optional<Game> findByCode(String code);

  Optional<Game> findByCodeAndIsActiveTrue(String code);
}
