package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.TrackListResponseDto;
import com.nabilbennai.f1sets.service.PublicTrackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/v1/public/games")
@Tag(name = "Public Track Catalog", description = "Read-only track catalog endpoints.")
public class PublicTrackController {

  private final PublicTrackService publicTrackService;

  public PublicTrackController(PublicTrackService publicTrackService) {
    this.publicTrackService = publicTrackService;
  }

  @GetMapping("/{gameCode}/tracks")
  @Operation(
      summary = "List tracks for game code",
      description = "Returns active tracks and data availability flags for the selected game.")
  @ApiResponses(
      value = {
        @ApiResponse(responseCode = "200", description = "Track list returned"),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid game code format",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
            responseCode = "404",
            description = "Game code not found",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
            responseCode = "500",
            description = "Server error",
            content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
      })
  public ResponseEntity<TrackListResponseDto> getTracks(
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode,
      @RequestParam(required = false) String query,
      @RequestParam(required = false) Boolean hasSetups,
      @RequestParam(required = false) Boolean hasLeaderboard,
      @RequestParam(required = false) Boolean hasAiDifficulty,
      @RequestParam(defaultValue = "name") String sort,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "24") int size) {
    return ResponseEntity.ok(
        publicTrackService.getTracksByGame(
            gameCode, query, hasSetups, hasLeaderboard, hasAiDifficulty, sort, page, size));
  }
}
