package com.nabilbennai.f1sets.rest;

import com.nabilbennai.f1sets.config.MinioProperties;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import io.minio.StatObjectArgs;
import io.minio.StatObjectResponse;
import java.io.InputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
public class ResourceController {

  private final MinioClient minioClient;
  private final MinioProperties minioProperties;

  @GetMapping("/{*objectKey}")
  public ResponseEntity<InputStreamResource> getResource(@PathVariable String objectKey) {
    try {
      StatObjectResponse stat =
          minioClient.statObject(
              StatObjectArgs.builder().bucket(minioProperties.bucket()).object(objectKey).build());

      InputStream stream =
          minioClient.getObject(
              GetObjectArgs.builder().bucket(minioProperties.bucket()).object(objectKey).build());

      String contentType =
          stat.contentType() == null || stat.contentType().isBlank()
              ? MediaType.APPLICATION_OCTET_STREAM_VALUE
              : stat.contentType();

      return ResponseEntity.ok()
          .header(HttpHeaders.CACHE_CONTROL, "public, max-age=3600")
          .contentType(MediaType.parseMediaType(contentType))
          .contentLength(stat.size())
          .body(new InputStreamResource(stream));
    } catch (Exception exception) {
      throw new NotFoundException("Resource not found");
    }
  }
}
