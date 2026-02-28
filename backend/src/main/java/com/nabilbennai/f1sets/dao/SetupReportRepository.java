package com.nabilbennai.f1sets.dao;

import com.nabilbennai.f1sets.model.entities.SetupReport;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SetupReportRepository extends JpaRepository<SetupReport, Long> {

  Optional<SetupReport> findBySetupIdAndReporterIdAndStatus(
      Long setupId, Long reporterId, String status);

  Page<SetupReport> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}
