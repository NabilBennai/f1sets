package com.nabilbennai.f1sets.service;

import org.springframework.web.multipart.MultipartFile;

public interface ProfileAvatarStorageService {

  String storeAvatar(Long userId, MultipartFile file);
}
