package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.config.MinioProperties;
import com.nabilbennai.f1sets.service.ProfileAvatarStorageService;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import java.io.InputStream;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class MinioProfileAvatarStorageService implements ProfileAvatarStorageService {

  private static final long MAX_FILE_SIZE_BYTES = 5L * 1024 * 1024;
  private static final Set<String> ALLOWED_CONTENT_TYPES =
      Set.of("image/jpeg", "image/png", "image/webp");

  private final MinioClient minioClient;
  private final MinioProperties minioProperties;

  @Override
  public String storeAvatar(Long userId, MultipartFile file) {
    validateFile(file);
    ensureBucketExists();

    String objectKey = buildObjectKey(userId, file.getOriginalFilename());

    try (InputStream inputStream = file.getInputStream()) {
      minioClient.putObject(
          PutObjectArgs.builder().bucket(minioProperties.bucket()).object(objectKey).stream(
                  inputStream, file.getSize(), -1)
              .contentType(file.getContentType())
              .build());
      return objectKey;
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to upload profile picture", exception);
    }
  }

  private void validateFile(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("Profile picture file is required");
    }

    if (file.getSize() > MAX_FILE_SIZE_BYTES) {
      throw new IllegalArgumentException("Profile picture exceeds 5MB limit");
    }

    String contentType = file.getContentType();
    if (contentType == null
        || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
      throw new IllegalArgumentException("Only JPG, PNG, or WEBP images are allowed");
    }
  }

  private void ensureBucketExists() {
    try {
      boolean exists =
          minioClient.bucketExists(
              BucketExistsArgs.builder().bucket(minioProperties.bucket()).build());
      if (!exists) {
        minioClient.makeBucket(MakeBucketArgs.builder().bucket(minioProperties.bucket()).build());
      }
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to prepare object storage bucket", exception);
    }
  }

  private String buildObjectKey(Long userId, String originalFilename) {
    String extension = "jpg";
    if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
      extension =
          originalFilename
              .substring(originalFilename.lastIndexOf('.') + 1)
              .toLowerCase(Locale.ROOT);
    }

    return "profiles/" + userId + "/" + UUID.randomUUID() + "." + extension;
  }
}
