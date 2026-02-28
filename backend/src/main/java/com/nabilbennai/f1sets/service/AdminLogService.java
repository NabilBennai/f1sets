package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.admin.AdminLogListResponseDto;
import java.time.Instant;

public interface AdminLogService {

  AdminLogListResponseDto getLogs(
      String level,
      String httpMethod,
      Integer statusFrom,
      Integer statusTo,
      String pathContains,
      String userEmailContains,
      Instant createdFrom,
      Instant createdTo,
      int page,
      int size,
      String sortBy,
      String sortDirection);
}
