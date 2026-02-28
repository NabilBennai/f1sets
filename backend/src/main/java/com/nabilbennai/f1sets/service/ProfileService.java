package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.profile.ProfileDto;
import com.nabilbennai.f1sets.model.dto.profile.ProfilePictureResponseDto;
import com.nabilbennai.f1sets.model.dto.profile.UpdateProfileRequestDto;
import org.springframework.web.multipart.MultipartFile;

public interface ProfileService {

  ProfileDto getMyProfile(String authenticatedEmail);

  ProfileDto updateMyProfile(String authenticatedEmail, UpdateProfileRequestDto request);

  ProfilePictureResponseDto uploadMyProfilePicture(String authenticatedEmail, MultipartFile file);

  ProfileDto getProfileByUserId(Long userId, String requesterEmail);
}
