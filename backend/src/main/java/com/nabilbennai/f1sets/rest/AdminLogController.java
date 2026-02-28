package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.admin.AdminLogListResponseDto;
import com.nabilbennai.f1sets.service.AdminLogService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/logs")
@PreAuthorize("hasRole('ADMIN')")
public class AdminLogController {

  private final AdminLogService adminLogService;

  @GetMapping
  public ResponseEntity<AdminLogListResponseDto> getLogs(
      @RequestParam(required = false) String level,
      @RequestParam(required = false) String httpMethod,
      @RequestParam(required = false) @Min(100) @Max(599) Integer statusFrom,
      @RequestParam(required = false) @Min(100) @Max(599) Integer statusTo,
      @RequestParam(required = false) String pathContains,
      @RequestParam(required = false) String userEmailContains,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
          Instant createdFrom,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
          Instant createdTo,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "50") @Min(1) @Max(200) int size,
      @RequestParam(defaultValue = "createdAt") String sortBy,
      @RequestParam(defaultValue = "DESC") String sortDirection) {
    return ResponseEntity.ok(
        adminLogService.getLogs(
            level,
            httpMethod,
            statusFrom,
            statusTo,
            pathContains,
            userEmailContains,
            createdFrom,
            createdTo,
            page,
            size,
            sortBy,
            sortDirection));
  }
}
