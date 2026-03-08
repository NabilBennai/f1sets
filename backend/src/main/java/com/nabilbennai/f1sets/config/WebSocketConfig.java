package com.nabilbennai.f1sets.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {

  private final ChatWebSocketHandler chatWebSocketHandler;
  private final ChatWebSocketAuthInterceptor chatWebSocketAuthInterceptor;

  @Override
  public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
    registry
        .addHandler(chatWebSocketHandler, "/ws/chat")
        .addInterceptors(chatWebSocketAuthInterceptor)
        .setAllowedOriginPatterns(
            "http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:8080");
  }
}
