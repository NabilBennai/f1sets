package com.nabilbennai.f1sets.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "minio")
public record MinioProperties(String url, String accessKey, String secretKey, String bucket) {}
