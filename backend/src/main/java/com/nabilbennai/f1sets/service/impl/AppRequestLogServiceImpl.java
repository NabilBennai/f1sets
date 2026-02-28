package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.dao.AppLogRepository;
import com.nabilbennai.f1sets.model.entities.AppLog;
import com.nabilbennai.f1sets.service.AppRequestLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppRequestLogServiceImpl implements AppRequestLogService {

  private final AppLogRepository appLogRepository;

  @Override
  @Transactional
  public void save(RequestLogEntry entry) {
    AppLog appLog = new AppLog();
    appLog.setLevel(trim(entry.level(), 16));
    appLog.setHttpMethod(trim(entry.httpMethod(), 10));
    appLog.setPath(trim(entry.path(), 255));
    appLog.setQueryString(trim(entry.queryString(), 1024));
    appLog.setStatusCode(entry.statusCode());
    appLog.setDurationMs(entry.durationMs());
    appLog.setUserEmail(trim(entry.userEmail(), 255));
    appLog.setUserRole(trim(entry.userRole(), 32));
    appLog.setClientIp(trim(entry.clientIp(), 64));
    appLog.setUserAgent(trim(entry.userAgent(), 512));
    appLog.setMessage(trim(entry.message(), 512));
    appLog.setRequestPayloadJson(trim(entry.requestPayloadJson(), 64000));
    appLog.setResponseBodyJson(trim(entry.responseBodyJson(), 64000));
    appLogRepository.save(appLog);
  }

  private String trim(String value, int maxLength) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    if (trimmed.isEmpty()) {
      return null;
    }
    return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
  }
}
