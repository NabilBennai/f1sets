package com.nabilbennai.f1sets.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabilbennai.f1sets.rest.ApiErrorCode;
import com.nabilbennai.f1sets.rest.ApiErrorResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;
  private final ApiRequestLoggingFilter apiRequestLoggingFilter;
  private final ObjectMapper objectMapper;

  @Bean
  public SecurityFilterChain filter(HttpSecurity http) throws Exception {

    http.cors(Customizer.withDefaults())
        // REST API without browser session auth, so CSRF is disabled.
        .csrf(csrf -> csrf.disable())

        // Keep API stateless (important once JWT auth is enabled).
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .exceptionHandling(
            exceptions ->
                exceptions
                    .authenticationEntryPoint(
                        (request, response, exception) ->
                            writeErrorResponse(
                                response,
                                401,
                                ApiErrorCode.UNAUTHORIZED,
                                "Authentication is required",
                                request.getRequestURI()))
                    .accessDeniedHandler(
                        (request, response, exception) ->
                            writeErrorResponse(
                                response,
                                403,
                                ApiErrorCode.FORBIDDEN,
                                "Access is denied",
                                request.getRequestURI())))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(
                        "/api/v1/auth/login",
                        "/api/v1/auth/register",
                        "/api/v1/auth/forgot-password",
                        "/api/v1/auth/reset-password",
                        "/api/v1/public/**",
                        "/api/v1/profiles/public/**",
                        "/api/v1/resources/**",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html",
                        "/error")
                    .permitAll()
                    .anyRequest()
                    .authenticated())

        // Disable default auth mechanisms not used by the API.
        .httpBasic(httpBasic -> httpBasic.disable())
        .formLogin(form -> form.disable())
        .logout(logout -> logout.disable())
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterAfter(apiRequestLoggingFilter, JwtAuthenticationFilter.class);

    return http.build();
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  private void writeErrorResponse(
      jakarta.servlet.http.HttpServletResponse response,
      int status,
      ApiErrorCode code,
      String message,
      String path)
      throws IOException {
    response.setStatus(status);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    ApiErrorResponse body = new ApiErrorResponse(Instant.now(), status, code.name(), message, path);
    response.getWriter().write(objectMapper.writeValueAsString(body));
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOriginPatterns(
        List.of("http://localhost:4200", "http://127.0.0.1:4200", "http://localhost:8080"));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setExposedHeaders(List.of("Location", "Authorization"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
