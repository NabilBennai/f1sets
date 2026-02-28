package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.setup.AdminHideSetupRequestDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupItemDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupReportListResponseDto;
import com.nabilbennai.f1sets.service.SetupPublishingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/setups")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSetupModerationController {

  private final SetupPublishingService setupPublishingService;

  @GetMapping("/reports")
  public ResponseEntity<SetupReportListResponseDto> getReports(
      @RequestParam(defaultValue = "OPEN") String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size) {
    return ResponseEntity.ok(setupPublishingService.getReports(status, page, size));
  }

  @PostMapping("/{setupId}/hide")
  public ResponseEntity<SetupItemDto> hideSetup(
      Authentication authentication,
      @PathVariable @Min(1) Long setupId,
      @Valid @RequestBody AdminHideSetupRequestDto request) {
    return ResponseEntity.ok(
        setupPublishingService.hideSetup(authentication.getName(), setupId, request.reason()));
  }

  @PostMapping("/{setupId}/unhide")
  public ResponseEntity<SetupItemDto> unhideSetup(
      Authentication authentication, @PathVariable @Min(1) Long setupId) {
    return ResponseEntity.ok(setupPublishingService.unhideSetup(authentication.getName(), setupId));
  }
}
