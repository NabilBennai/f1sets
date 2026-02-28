package com.nabilbennai.f1sets.config;

import io.minio.MinioClient;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(MinioProperties.class)
public class StorageConfig {

  @Bean
  public MinioClient minioClient(MinioProperties minioProperties) {
    return MinioClient.builder()
        .endpoint(minioProperties.url())
        .credentials(minioProperties.accessKey(), minioProperties.secretKey())
        .build();
  }
}
