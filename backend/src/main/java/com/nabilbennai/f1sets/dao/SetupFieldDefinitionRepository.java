package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.Game;
import com.nabilbennai.f1sets.model.entities.SetupFieldDefinition;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SetupFieldDefinitionRepository extends JpaRepository<SetupFieldDefinition, Long> {

  List<SetupFieldDefinition> findByGameOrderBySortOrderAscFieldLabelAsc(Game game);

  void deleteByGame(Game game);
}
