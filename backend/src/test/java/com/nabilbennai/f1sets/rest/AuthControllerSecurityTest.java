package com.nabilbennai.f1sets.rest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nabilbennai.f1sets.dao.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerSecurityTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private UserRepository userRepository;

  @BeforeEach
  void cleanUsers() {
    userRepository.deleteAll();
  }

  @Test
  void meEndpointRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
  }

  @Test
  void registerEndpointCreatesUserAndReturnsCreated() throws Exception {
    String payload =
        """
        {
          "email": "driver@f1sets.local",
          "password": "password123",
          "displayName": "Driver One"
        }
        """;
    mockMvc
        .perform(
            post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.user.email").value("driver@f1sets.local"));
  }
}
