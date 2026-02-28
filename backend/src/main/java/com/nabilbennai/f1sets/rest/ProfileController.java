package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.model.dto.profile.ProfileDto;
import com.nabilbennai.f1sets.model.dto.profile.ProfilePictureResponseDto;
import com.nabilbennai.f1sets.model.dto.profile.UpdateProfileRequestDto;
import com.nabilbennai.f1sets.service.ProfileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Validated
@RequestMapping("/api/v1/profiles")
@RequiredArgsConstructor
public class ProfileController {

  private final ProfileService profileService;

  @GetMapping("/me")
  public ResponseEntity<ProfileDto> getMyProfile(Authentication authentication) {
    return ResponseEntity.ok(profileService.getMyProfile(authentication.getName()));
  }

  @PatchMapping("/me")
  public ResponseEntity<ProfileDto> updateMyProfile(
      Authentication authentication, @Valid @RequestBody UpdateProfileRequestDto request) {
    return ResponseEntity.ok(profileService.updateMyProfile(authentication.getName(), request));
  }

  @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public ResponseEntity<ProfilePictureResponseDto> uploadAvatar(
      Authentication authentication, @RequestPart("file") MultipartFile file) {
    return ResponseEntity.ok(profileService.uploadMyProfilePicture(authentication.getName(), file));
  }

  @GetMapping("/public/{userId}")
  public ResponseEntity<ProfileDto> getPublicProfile(
      @PathVariable @Min(1) Long userId, Authentication authentication) {
    String requesterEmail = authentication == null ? null : authentication.getName();
    return ResponseEntity.ok(profileService.getProfileByUserId(userId, requesterEmail));
  }
}
