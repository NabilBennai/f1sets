package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.aidifficulty.AiDifficultyCalculationResponseDto;
import com.nabilbennai.f1sets.model.dto.aidifficulty.AiDifficultyCurveResponseDto;
import com.nabilbennai.f1sets.model.dto.aidifficulty.CalculateAiDifficultyRequestDto;
import com.nabilbennai.f1sets.service.AiDifficultyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/public/ai-difficulty")
@Tag(name = "Public AI Difficulty", description = "Read-only AI difficulty curve and calculator.")
public class PublicAiDifficultyController {

  private final AiDifficultyService aiDifficultyService;

  public PublicAiDifficultyController(AiDifficultyService aiDifficultyService) {
    this.aiDifficultyService = aiDifficultyService;
  }

  @GetMapping("/{gameCode}/{trackSlug}/curve")
  @Operation(
      summary = "Get AI difficulty curve by track",
      description = "Returns slope/intercept and references for the selected game and track.")
  @ApiResponses(
      value = {
        @ApiResponse(responseCode = "200", description = "Curve returned"),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid request",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
            responseCode = "404",
            description = "Curve not found",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
      })
  public ResponseEntity<AiDifficultyCurveResponseDto> getCurve(
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode,
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{2,64}$",
              message =
                  "trackSlug must be 2-64 chars and only contain letters, numbers, underscore, or hyphen")
          String trackSlug) {
    return ResponseEntity.ok(aiDifficultyService.getCurve(gameCode, trackSlug));
  }

  @PostMapping("/{gameCode}/{trackSlug}/calculate")
  @Operation(
      summary = "Calculate AI difficulty by lap time",
      description =
          "Applies the track curve formula to a lap time and returns recommended difficulty.")
  @ApiResponses(
      value = {
        @ApiResponse(responseCode = "200", description = "Calculation returned"),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid lap time payload",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
            responseCode = "404",
            description = "Curve not found",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
      })
  public ResponseEntity<AiDifficultyCalculationResponseDto> calculate(
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode,
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{2,64}$",
              message =
                  "trackSlug must be 2-64 chars and only contain letters, numbers, underscore, or hyphen")
          String trackSlug,
      @Valid @RequestBody CalculateAiDifficultyRequestDto request) {
    return ResponseEntity.ok(
        aiDifficultyService.calculate(gameCode, trackSlug, request.lapTimeMs()));
  }
}
