package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.setup.PublishSetupRequestDto;
import com.nabilbennai.f1sets.model.dto.setup.RateSetupRequestDto;
import com.nabilbennai.f1sets.model.dto.setup.ReportSetupRequestDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupFieldSchemaResponseDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupItemDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupListResponseDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupReportItemDto;
import com.nabilbennai.f1sets.model.dto.setup.UpdateSetupRequestDto;
import com.nabilbennai.f1sets.service.SetupFieldSchemaService;
import com.nabilbennai.f1sets.service.SetupPublishingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1")
public class SetupController {

  private final SetupPublishingService setupPublishingService;
  private final SetupFieldSchemaService setupFieldSchemaService;

  @PostMapping("/setups")
  public ResponseEntity<SetupItemDto> publishSetup(
      Authentication authentication, @Valid @RequestBody PublishSetupRequestDto request) {
    return ResponseEntity.ok(
        setupPublishingService.publishSetup(authentication.getName(), request));
  }

  @PatchMapping("/setups/{setupId}")
  public ResponseEntity<SetupItemDto> updateSetup(
      Authentication authentication,
      @PathVariable @Min(1) Long setupId,
      @Valid @RequestBody UpdateSetupRequestDto request) {
    return ResponseEntity.ok(
        setupPublishingService.updateSetup(authentication.getName(), setupId, request));
  }

  @DeleteMapping("/setups/{setupId}")
  public ResponseEntity<Void> deleteSetup(
      Authentication authentication, @PathVariable @Min(1) Long setupId) {
    setupPublishingService.deleteSetup(authentication.getName(), setupId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/setups/{setupId}/vote")
  public ResponseEntity<SetupItemDto> rateSetup(
      Authentication authentication,
      @PathVariable @Min(1) Long setupId,
      @Valid @RequestBody RateSetupRequestDto request) {
    return ResponseEntity.ok(
        setupPublishingService.rateSetup(authentication.getName(), setupId, request.vote()));
  }

  @PostMapping("/setups/{setupId}/report")
  public ResponseEntity<SetupReportItemDto> reportSetup(
      Authentication authentication,
      @PathVariable @Min(1) Long setupId,
      @Valid @RequestBody ReportSetupRequestDto request) {
    return ResponseEntity.ok(
        setupPublishingService.reportSetup(authentication.getName(), setupId, request.reason()));
  }

  @GetMapping("/setups/recommended")
  public ResponseEntity<java.util.List<SetupItemDto>> recommendedSetups(
      Authentication authentication,
      @RequestParam(required = false)
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode,
      @RequestParam(defaultValue = "8") int limit) {
    return ResponseEntity.ok(
        setupPublishingService.getRecommendedSetups(authentication.getName(), gameCode, limit));
  }

  @GetMapping("/public/setups")
  public ResponseEntity<SetupListResponseDto> searchSetups(
      @RequestParam(required = false)
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode,
      @RequestParam(required = false)
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{2,64}$",
              message =
                  "trackSlug must be 2-64 chars and only contain letters, numbers, underscore, or hyphen")
          String trackSlug,
      @RequestParam(required = false) String query,
      @RequestParam(required = false) String sessionType,
      @RequestParam(required = false) String weatherCondition,
      @RequestParam(required = false) String inputDevice,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size) {
    return ResponseEntity.ok(
        setupPublishingService.searchSetups(
            gameCode, trackSlug, query, sessionType, weatherCondition, inputDevice, page, size));
  }

  @GetMapping("/public/games/{gameCode}/setup-fields")
  public ResponseEntity<SetupFieldSchemaResponseDto> getSetupFieldSchema(
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode) {
    return ResponseEntity.ok(setupFieldSchemaService.getSchemaByGameCode(gameCode));
  }
}
