package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.config.MinioProperties;
import com.nabilbennai.f1sets.service.TrackPhotoStorageService;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class MinioTrackPhotoStorageService implements TrackPhotoStorageService {

  private static final long MAX_FILE_SIZE_BYTES = 8L * 1024 * 1024;
  private static final int MAX_WIDTH = 1920;
  private static final int MAX_HEIGHT = 1080;
  private static final Set<String> ALLOWED_CONTENT_TYPES =
      Set.of("image/jpeg", "image/png", "image/webp");

  private final MinioClient minioClient;
  private final MinioProperties minioProperties;

  @Override
  public String storeTrackPhoto(Long trackId, MultipartFile file) {
    validateFile(file);
    ensureBucketExists();

    String objectKey = buildObjectKey(trackId, file.getOriginalFilename());
    ProcessedImage processedImage = processImage(file);
    try (InputStream inputStream = new ByteArrayInputStream(processedImage.bytes())) {
      minioClient.putObject(
          PutObjectArgs.builder().bucket(minioProperties.bucket()).object(objectKey).stream(
                  inputStream, processedImage.size(), -1)
              .contentType(processedImage.contentType())
              .build());
      return objectKey;
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to upload track photo", exception);
    }
  }

  @Override
  public void deleteTrackPhoto(String objectKey) {
    if (!StringUtils.hasText(objectKey)) {
      return;
    }

    try {
      minioClient.removeObject(
          RemoveObjectArgs.builder()
              .bucket(minioProperties.bucket())
              .object(objectKey.trim())
              .build());
    } catch (Exception ignored) {
      // Keep API flow resilient even if object cleanup fails.
    }
  }

  private void validateFile(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new IllegalArgumentException("Track photo file is required");
    }

    if (file.getSize() > MAX_FILE_SIZE_BYTES) {
      throw new IllegalArgumentException("Track photo exceeds 8MB limit");
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

  private String buildObjectKey(Long trackId, String originalFilename) {
    String extension = "jpg";
    if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
      extension =
          originalFilename
              .substring(originalFilename.lastIndexOf('.') + 1)
              .toLowerCase(Locale.ROOT);
    }

    return "tracks/" + trackId + "/" + UUID.randomUUID() + "." + extension;
  }

  private ProcessedImage processImage(MultipartFile file) {
    String contentType = file.getContentType();
    if (contentType == null || contentType.equalsIgnoreCase("image/webp")) {
      try {
        return new ProcessedImage(file.getBytes(), file.getSize(), file.getContentType());
      } catch (Exception exception) {
        throw new IllegalStateException("Unable to process track photo", exception);
      }
    }

    try {
      BufferedImage source = ImageIO.read(file.getInputStream());
      if (source == null) {
        return new ProcessedImage(file.getBytes(), file.getSize(), file.getContentType());
      }

      int sourceWidth = source.getWidth();
      int sourceHeight = source.getHeight();
      double widthScale = (double) MAX_WIDTH / sourceWidth;
      double heightScale = (double) MAX_HEIGHT / sourceHeight;
      double scale = Math.min(1.0, Math.min(widthScale, heightScale));

      BufferedImage output = source;
      if (scale < 1.0) {
        int targetWidth = Math.max(1, (int) Math.round(sourceWidth * scale));
        int targetHeight = Math.max(1, (int) Math.round(sourceHeight * scale));
        int type =
            contentType.equalsIgnoreCase("image/png")
                ? BufferedImage.TYPE_INT_ARGB
                : BufferedImage.TYPE_INT_RGB;
        output = new BufferedImage(targetWidth, targetHeight, type);
        Graphics2D graphics = output.createGraphics();
        graphics.setRenderingHint(
            RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(
            RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        graphics.setRenderingHint(
            RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        graphics.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        graphics.dispose();
      }

      String format = contentType.equalsIgnoreCase("image/png") ? "png" : "jpg";
      ByteArrayOutputStream buffer = new ByteArrayOutputStream();
      ImageIO.write(output, format, buffer);
      byte[] bytes = buffer.toByteArray();
      String normalizedContentType = format.equals("png") ? "image/png" : "image/jpeg";
      return new ProcessedImage(bytes, bytes.length, normalizedContentType);
    } catch (Exception exception) {
      throw new IllegalStateException("Unable to process track photo", exception);
    }
  }

  private record ProcessedImage(byte[] bytes, long size, String contentType) {}
}
