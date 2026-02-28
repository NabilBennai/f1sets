package com.nabilbennai.f1sets.service;

public interface AppRequestLogService {

  void save(RequestLogEntry entry);

  record RequestLogEntry(
      String level,
      String httpMethod,
      String path,
      String queryString,
      int statusCode,
      long durationMs,
      String userEmail,
      String userRole,
      String clientIp,
      String userAgent,
      String message,
      String requestPayloadJson,
      String responseBodyJson) {}
}
