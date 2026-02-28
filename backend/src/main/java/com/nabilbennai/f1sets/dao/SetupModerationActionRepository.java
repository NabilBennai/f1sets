package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.SetupModerationAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SetupModerationActionRepository
    extends JpaRepository<SetupModerationAction, Long> {}
