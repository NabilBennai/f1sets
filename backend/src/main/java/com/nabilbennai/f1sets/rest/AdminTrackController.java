package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.admin.AdminTrackDto;
import com.nabilbennai.f1sets.model.dto.admin.AdminTrackListResponseDto;
import com.nabilbennai.f1sets.model.dto.admin.CreateTrackRequestDto;
import com.nabilbennai.f1sets.model.dto.admin.TrackPhotoResponseDto;
import com.nabilbennai.f1sets.model.dto.admin.UpdateTrackRequestDto;
import com.nabilbennai.f1sets.service.AdminTrackService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Validated
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminTrackController {

  private final AdminTrackService adminTrackService;

  @GetMapping("/games/{gameCode}/tracks")
  public ResponseEntity<AdminTrackListResponseDto> getTracksByGame(
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode) {
    return ResponseEntity.ok(adminTrackService.getTracksByGame(gameCode));
  }

  @PostMapping("/games/{gameCode}/tracks")
  public ResponseEntity<AdminTrackDto> createTrack(
      @PathVariable
          @Pattern(
              regexp = "^[a-zA-Z0-9_-]{3,20}$",
              message =
                  "gameCode must be 3-20 chars and only contain letters, numbers, underscore, or hyphen")
          String gameCode,
      @Valid @RequestBody CreateTrackRequestDto request) {
    return ResponseEntity.ok(adminTrackService.createTrack(gameCode, request));
  }

  @PatchMapping("/tracks/{trackId}")
  public ResponseEntity<AdminTrackDto> updateTrack(
      @PathVariable @Min(1) Long trackId, @Valid @RequestBody UpdateTrackRequestDto request) {
    return ResponseEntity.ok(adminTrackService.updateTrack(trackId, request));
  }

  @DeleteMapping("/tracks/{trackId}")
  public ResponseEntity<Void> deleteTrack(@PathVariable @Min(1) Long trackId) {
    adminTrackService.deleteTrack(trackId);
    return ResponseEntity.noContent().build();
  }

  @PostMapping(value = "/tracks/{trackId}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<TrackPhotoResponseDto> uploadTrackPhoto(
      @PathVariable @Min(1) Long trackId, @RequestPart("file") MultipartFile file) {
    return ResponseEntity.ok(adminTrackService.uploadTrackPhoto(trackId, file));
  }
}
