package com.nabilbennai.f1sets.config;

import com.nabilbennai.f1sets.service.AppRequestLogService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

@Slf4j
@Component
@RequiredArgsConstructor
public class ApiRequestLoggingFilter extends OncePerRequestFilter {

  private static final int MAX_JSON_BODY_CHARS = 64000;
  private final AppRequestLogService appRequestLogService;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    ContentCachingRequestWrapper wrappedRequest =
        new ContentCachingRequestWrapper(request, 10000000);
    ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);
    long startNanos = System.nanoTime();
    Throwable failure = null;

    try {
      filterChain.doFilter(wrappedRequest, wrappedResponse);
    } catch (RuntimeException | ServletException | IOException exception) {
      failure = exception;
      throw exception;
    } finally {
      long durationMs = Math.max(0, (System.nanoTime() - startNanos) / 1_000_000);
      int statusCode = wrappedResponse.getStatus();
      String level = resolveLevel(statusCode, failure);
      String method = wrappedRequest.getMethod();
      String path = wrappedRequest.getRequestURI();
      String query = wrappedRequest.getQueryString();
      String ip = resolveClientIp(wrappedRequest);
      String userAgent = wrappedRequest.getHeader("User-Agent");
      String requestPayloadJson = extractJsonRequestBody(wrappedRequest);
      String responseBodyJson = extractJsonResponseBody(wrappedResponse);
      AuthContext authContext = resolveAuthContext();
      String message = method + " " + path + " -> " + statusCode + " (" + durationMs + "ms)";

      logToConsole(level, message, authContext.email(), authContext.role(), ip, query);
      saveToDatabase(
          new AppRequestLogService.RequestLogEntry(
              level,
              method,
              path,
              query,
              statusCode,
              durationMs,
              authContext.email(),
              authContext.role(),
              ip,
              userAgent,
              message,
              requestPayloadJson,
              responseBodyJson));
      wrappedResponse.copyBodyToResponse();
    }
  }

  private void saveToDatabase(AppRequestLogService.RequestLogEntry entry) {
    try {
      appRequestLogService.save(entry);
    } catch (Exception exception) {
      log.warn("Failed to persist request log entry: {}", exception.getMessage());
    }
  }

  private void logToConsole(
      String level, String message, String userEmail, String userRole, String ip, String query) {
    String details =
        " | user="
            + (userEmail == null ? "anonymous" : userEmail)
            + " role="
            + (userRole == null ? "-" : userRole)
            + " ip="
            + (ip == null ? "-" : ip)
            + " query="
            + (query == null ? "-" : query);

    switch (level) {
      case "ERROR" -> log.error("{}{}", message, details);
      case "WARN" -> log.warn("{}{}", message, details);
      default -> log.info("{}{}", message, details);
    }
  }

  private String resolveLevel(int statusCode, Throwable failure) {
    if (failure != null || statusCode >= 500) {
      return "ERROR";
    }
    if (statusCode >= 400) {
      return "WARN";
    }
    return "INFO";
  }

  private String resolveClientIp(HttpServletRequest request) {
    String xForwardedFor = request.getHeader("X-Forwarded-For");
    if (xForwardedFor != null && !xForwardedFor.isBlank()) {
      return xForwardedFor.split(",")[0].trim();
    }
    return request.getRemoteAddr();
  }

  private AuthContext resolveAuthContext() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null
        || !authentication.isAuthenticated()
        || authentication instanceof AnonymousAuthenticationToken) {
      return new AuthContext(null, null);
    }

    String email = authentication.getName();
    String role =
        authentication.getAuthorities().stream()
            .findFirst()
            .map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
            .map(value -> value.toUpperCase(Locale.ROOT))
            .orElse(null);
    return new AuthContext(email, role);
  }

  private String extractJsonRequestBody(ContentCachingRequestWrapper request) {
    if (!isJsonContentType(request.getContentType())) {
      return null;
    }
    return decodeBody(request.getContentAsByteArray(), request.getCharacterEncoding());
  }

  private String extractJsonResponseBody(ContentCachingResponseWrapper response) {
    if (!isJsonContentType(response.getContentType())) {
      return null;
    }
    return decodeBody(response.getContentAsByteArray(), response.getCharacterEncoding());
  }

  private String decodeBody(byte[] content, String encoding) {
    if (content == null || content.length == 0) {
      return null;
    }
    Charset charset;
    try {
      charset = encoding == null ? StandardCharsets.UTF_8 : Charset.forName(encoding);
    } catch (Exception ignored) {
      charset = StandardCharsets.UTF_8;
    }
    String decoded = new String(content, charset).trim();
    if (decoded.isEmpty()) {
      return null;
    }
    return decoded.length() <= MAX_JSON_BODY_CHARS
        ? decoded
        : decoded.substring(0, MAX_JSON_BODY_CHARS);
  }

  private boolean isJsonContentType(String contentType) {
    if (contentType == null || contentType.isBlank()) {
      return false;
    }
    String normalized = contentType.toLowerCase(Locale.ROOT);
    return normalized.contains("application/json") || normalized.contains("+json");
  }

  private record AuthContext(String email, String role) {}
}
