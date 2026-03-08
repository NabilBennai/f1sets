package com.nabilbennai.f1sets.config;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Component
@RequiredArgsConstructor
public class ChatWebSocketAuthInterceptor implements HandshakeInterceptor {

  static final String ATTR_USER_ID = "chatUserId";
  static final String ATTR_USER_EMAIL = "chatUserEmail";

  private final JwtService jwtService;
  private final AppUserDetailsService userDetailsService;

  @Override
  public boolean beforeHandshake(
      ServerHttpRequest request,
      ServerHttpResponse response,
      org.springframework.web.socket.WebSocketHandler wsHandler,
      Map<String, Object> attributes) {
    String token = extractToken(request);
    if (token == null || token.isBlank()) {
      response.setStatusCode(HttpStatus.UNAUTHORIZED);
      return false;
    }

    try {
      String email = jwtService.extractUsername(token);
      if (email == null || email.isBlank()) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return false;
      }

      UserDetails userDetails = userDetailsService.loadUserByUsername(email);
      if (!jwtService.isTokenValid(token, userDetails)) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        return false;
      }

      if (userDetails instanceof AppUserPrincipal principal) {
        attributes.put(ATTR_USER_ID, principal.getId());
      }
      attributes.put(ATTR_USER_EMAIL, userDetails.getUsername());
      return true;
    } catch (Exception ignored) {
      response.setStatusCode(HttpStatus.UNAUTHORIZED);
      return false;
    }
  }

  @Override
  public void afterHandshake(
      ServerHttpRequest request,
      ServerHttpResponse response,
      org.springframework.web.socket.WebSocketHandler wsHandler,
      Exception exception) {
    // No-op.
  }

  private String extractToken(ServerHttpRequest request) {
    String queryToken = extractTokenFromQuery(request);
    if (queryToken != null && !queryToken.isBlank()) {
      return queryToken;
    }

    HttpHeaders headers = request.getHeaders();
    String authorization = headers.getFirst(HttpHeaders.AUTHORIZATION);
    if (authorization == null || !authorization.startsWith("Bearer ")) {
      return null;
    }
    return authorization.substring(7);
  }

  private String extractTokenFromQuery(ServerHttpRequest request) {
    if (!(request instanceof ServletServerHttpRequest servletRequest)) {
      return null;
    }
    String query = servletRequest.getServletRequest().getQueryString();
    if (query == null || query.isBlank()) {
      return null;
    }

    Map<String, String> params = parseQuery(query);
    return params.get("token");
  }

  private Map<String, String> parseQuery(String query) {
    Map<String, String> values = new HashMap<>();
    for (String part : query.split("&")) {
      if (part.isBlank()) {
        continue;
      }
      String[] chunks = part.split("=", 2);
      String key = URLDecoder.decode(chunks[0], StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
      String value = chunks.length > 1 ? URLDecoder.decode(chunks[1], StandardCharsets.UTF_8) : "";
      values.put(key, value);
    }
    return values;
  }
}
