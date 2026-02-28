package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.AppLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AppLogRepository
    extends JpaRepository<AppLog, Long>, JpaSpecificationExecutor<AppLog> {}
