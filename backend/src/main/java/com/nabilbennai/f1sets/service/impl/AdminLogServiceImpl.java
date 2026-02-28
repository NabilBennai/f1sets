package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.dao.AppLogRepository;
import com.nabilbennai.f1sets.model.dto.admin.AdminLogItemDto;
import com.nabilbennai.f1sets.model.dto.admin.AdminLogListResponseDto;
import com.nabilbennai.f1sets.model.entities.AppLog;
import com.nabilbennai.f1sets.service.AdminLogService;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AdminLogServiceImpl implements AdminLogService {

  private static final Map<String, String> SORT_FIELDS =
      Map.of(
          "createdAt", "createdAt",
          "statusCode", "statusCode",
          "durationMs", "durationMs",
          "level", "level",
          "path", "path",
          "httpMethod", "httpMethod");

  private final AppLogRepository appLogRepository;

  @Override
  @Transactional(readOnly = true)
  public AdminLogListResponseDto getLogs(
      String level,
      String httpMethod,
      Integer statusFrom,
      Integer statusTo,
      String pathContains,
      String userEmailContains,
      Instant createdFrom,
      Instant createdTo,
      int page,
      int size,
      String sortBy,
      String sortDirection) {
    String normalizedLevel = normalizeUpper(level);
    String normalizedHttpMethod = normalizeUpper(httpMethod);
    String normalizedPathContains = normalizeLower(pathContains);
    String normalizedUserEmailContains = normalizeLower(userEmailContains);

    int normalizedPage = Math.max(page, 0);
    int normalizedSize = Math.min(Math.max(size, 1), 200);
    String normalizedSortBy = SORT_FIELDS.getOrDefault(sortBy, "createdAt");
    Sort.Direction direction =
        "asc".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;

    Specification<AppLog> specification = (root, query, builder) -> builder.conjunction();
    if (StringUtils.hasText(normalizedLevel)) {
      specification =
          specification.and(
              (root, query, builder) -> builder.equal(root.get("level"), normalizedLevel));
    }
    if (StringUtils.hasText(normalizedHttpMethod)) {
      specification =
          specification.and(
              (root, query, builder) ->
                  builder.equal(root.get("httpMethod"), normalizedHttpMethod));
    }
    if (statusFrom != null) {
      specification =
          specification.and(
              (root, query, builder) ->
                  builder.greaterThanOrEqualTo(root.get("statusCode"), statusFrom));
    }
    if (statusTo != null) {
      specification =
          specification.and(
              (root, query, builder) ->
                  builder.lessThanOrEqualTo(root.get("statusCode"), statusTo));
    }
    if (StringUtils.hasText(normalizedPathContains)) {
      specification =
          specification.and(
              (root, query, builder) ->
                  builder.like(
                      builder.lower(root.get("path")), "%" + normalizedPathContains + "%"));
    }
    if (StringUtils.hasText(normalizedUserEmailContains)) {
      specification =
          specification.and(
              (root, query, builder) ->
                  builder.like(
                      builder.lower(builder.coalesce(root.get("userEmail"), "")),
                      "%" + normalizedUserEmailContains + "%"));
    }
    if (createdFrom != null) {
      specification =
          specification.and(
              (root, query, builder) ->
                  builder.greaterThanOrEqualTo(root.get("createdAt"), createdFrom));
    }
    if (createdTo != null) {
      specification =
          specification.and(
              (root, query, builder) ->
                  builder.lessThanOrEqualTo(root.get("createdAt"), createdTo));
    }

    Page<AppLog> logs =
        appLogRepository.findAll(
            specification,
            PageRequest.of(normalizedPage, normalizedSize, Sort.by(direction, normalizedSortBy)));

    return new AdminLogListResponseDto(
        logs.getNumber(),
        logs.getSize(),
        logs.getTotalElements(),
        logs.getTotalPages(),
        normalizedSortBy,
        direction.name(),
        normalizedLevel,
        normalizedHttpMethod,
        statusFrom,
        statusTo,
        normalizedPathContains,
        normalizedUserEmailContains,
        createdFrom,
        createdTo,
        logs.getContent().stream().map(this::toItem).toList());
  }

  private AdminLogItemDto toItem(AppLog log) {
    return new AdminLogItemDto(
        log.getId(),
        log.getCreatedAt(),
        log.getLevel(),
        log.getHttpMethod(),
        log.getPath(),
        log.getQueryString(),
        log.getStatusCode(),
        log.getDurationMs(),
        log.getUserEmail(),
        log.getUserRole(),
        log.getClientIp(),
        log.getUserAgent(),
        log.getMessage(),
        log.getRequestPayloadJson(),
        log.getResponseBodyJson());
  }

  private String normalizeUpper(String value) {
    return value == null ? null : value.trim().toUpperCase(Locale.ROOT);
  }

  private String normalizeLower(String value) {
    return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
  }
}
