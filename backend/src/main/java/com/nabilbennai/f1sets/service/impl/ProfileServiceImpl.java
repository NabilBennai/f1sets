package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.config.MinioProperties;
import com.nabilbennai.f1sets.dao.UserProfileRepository;
import com.nabilbennai.f1sets.dao.UserRepository;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import com.nabilbennai.f1sets.miscellaneous.UnauthorizedException;
import com.nabilbennai.f1sets.model.dto.profile.ProfileDto;
import com.nabilbennai.f1sets.model.dto.profile.ProfilePictureResponseDto;
import com.nabilbennai.f1sets.model.dto.profile.UpdateProfileRequestDto;
import com.nabilbennai.f1sets.model.entities.User;
import com.nabilbennai.f1sets.model.entities.UserProfile;
import com.nabilbennai.f1sets.model.enums.Visibility;
import com.nabilbennai.f1sets.service.ProfileAvatarStorageService;
import com.nabilbennai.f1sets.service.ProfileService;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ProfileServiceImpl implements ProfileService {

  private final UserRepository userRepository;
  private final UserProfileRepository userProfileRepository;
  private final ProfileAvatarStorageService profileAvatarStorageService;
  private final MinioProperties minioProperties;

  @Value("${app.backend-url:http://localhost:8080}")
  private String backendUrl;

  @Override
  @Transactional(readOnly = true)
  public ProfileDto getMyProfile(String authenticatedEmail) {
    User user = findUserByEmail(authenticatedEmail);
    UserProfile profile = getExistingOrDefaultProfile(user);
    return toDto(profile, true);
  }

  @Override
  @Transactional
  public ProfileDto updateMyProfile(String authenticatedEmail, UpdateProfileRequestDto request) {
    User user = findUserByEmail(authenticatedEmail);
    UserProfile profile = getOrCreateProfile(user);

    profile.setFirstName(trimToNull(request.firstName()));
    profile.setLastName(trimToNull(request.lastName()));
    profile.setDateOfBirth(request.dateOfBirth());
    profile.setCountry(trimToNull(request.country()));
    profile.setLanguages(toLanguageStorage(request.languages()));
    profile.setVisibility(
        request.visibility() == null ? profile.getVisibility() : request.visibility());

    UserProfile saved = userProfileRepository.save(profile);
    return toDto(saved, true);
  }

  @Override
  @Transactional
  public ProfilePictureResponseDto uploadMyProfilePicture(
      String authenticatedEmail, MultipartFile file) {
    User user = findUserByEmail(authenticatedEmail);
    UserProfile profile = getOrCreateProfile(user);

    String objectKey = profileAvatarStorageService.storeAvatar(user.getId(), file);
    String avatarUrl = buildAvatarUrl(objectKey);
    profile.setAvatarObjectKey(objectKey);
    profile.setAvatarUrl(avatarUrl);
    userProfileRepository.save(profile);

    return new ProfilePictureResponseDto(avatarUrl);
  }

  @Override
  @Transactional(readOnly = true)
  public ProfileDto getProfileByUserId(Long userId, String requesterEmail) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new NotFoundException("Profile not found"));
    UserProfile profile = getExistingOrDefaultProfile(user);

    boolean owner =
        requesterEmail != null && user.getEmail().equalsIgnoreCase(requesterEmail.trim());
    if (!owner && profile.getVisibility() == Visibility.PRIVATE) {
      throw new NotFoundException("Profile not found");
    }

    return toDto(profile, owner);
  }

  private User findUserByEmail(String email) {
    return userRepository
        .findByEmail(normalizeEmail(email))
        .orElseThrow(() -> new UnauthorizedException("User authentication is required"));
  }

  private UserProfile getOrCreateProfile(User user) {
    return userProfileRepository
        .findByUser(user)
        .orElseGet(
            () -> {
              UserProfile profile = new UserProfile();
              profile.setUser(user);
              profile.setVisibility(Visibility.PRIVATE);
              return userProfileRepository.save(profile);
            });
  }

  private UserProfile getExistingOrDefaultProfile(User user) {
    return userProfileRepository
        .findByUser(user)
        .orElseGet(
            () -> {
              UserProfile profile = new UserProfile();
              profile.setUser(user);
              profile.setVisibility(Visibility.PRIVATE);
              return profile;
            });
  }

  private ProfileDto toDto(UserProfile profile, boolean owner) {
    User user = profile.getUser();
    String objectKey = profile.getAvatarObjectKey();
    if (!StringUtils.hasText(objectKey)) {
      objectKey = extractObjectKeyFromLegacyUrl(profile.getAvatarUrl());
    }

    String resolvedAvatarUrl =
        StringUtils.hasText(objectKey) ? buildAvatarUrl(objectKey) : profile.getAvatarUrl();

    return new ProfileDto(
        user.getId(),
        user.getDisplayName(),
        owner ? user.getEmail() : null,
        profile.getFirstName(),
        profile.getLastName(),
        profile.getDateOfBirth(),
        profile.getCountry(),
        fromLanguageStorage(profile.getLanguages()),
        profile.getVisibility(),
        resolvedAvatarUrl,
        owner);
  }

  private String toLanguageStorage(List<String> languages) {
    if (languages == null || languages.isEmpty()) {
      return null;
    }

    List<String> normalized =
        languages.stream().map(this::trimToNull).filter(StringUtils::hasText).distinct().toList();

    if (normalized.isEmpty()) {
      return null;
    }

    return String.join(",", normalized);
  }

  private List<String> fromLanguageStorage(String rawLanguages) {
    if (!StringUtils.hasText(rawLanguages)) {
      return List.of();
    }

    return Arrays.stream(rawLanguages.split(","))
        .map(String::trim)
        .filter(StringUtils::hasText)
        .collect(Collectors.toList());
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase();
  }

  private String trimToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  private String buildAvatarUrl(String objectKey) {
    String normalizedBackendUrl = backendUrl.replaceAll("/$", "");
    return normalizedBackendUrl + "/api/v1/resources/" + objectKey;
  }

  private String extractObjectKeyFromLegacyUrl(String avatarUrl) {
    if (!StringUtils.hasText(avatarUrl)) {
      return null;
    }

    String prefix =
        minioProperties.url().replaceAll("/$", "") + "/" + minioProperties.bucket() + "/";
    if (!avatarUrl.startsWith(prefix)) {
      return null;
    }

    String key = avatarUrl.substring(prefix.length()).trim();
    return key.isEmpty() ? null : key;
  }
}
