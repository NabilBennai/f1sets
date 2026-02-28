package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.setup.SaveSetupFieldSchemaRequestDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupFieldSchemaResponseDto;
import com.nabilbennai.f1sets.service.SetupFieldSchemaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/games/{gameCode}/setup-fields")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSetupFieldSchemaController {

  private final SetupFieldSchemaService setupFieldSchemaService;

  @GetMapping
  public ResponseEntity<SetupFieldSchemaResponseDto> getSchema(
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode) {
    return ResponseEntity.ok(setupFieldSchemaService.getSchemaByGameCode(gameCode));
  }

  @PutMapping
  public ResponseEntity<SetupFieldSchemaResponseDto> saveSchema(
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode,
      @Valid @RequestBody SaveSetupFieldSchemaRequestDto request) {
    return ResponseEntity.ok(
        setupFieldSchemaService.saveSchemaByGameCode(gameCode, request.fields()));
  }
}
