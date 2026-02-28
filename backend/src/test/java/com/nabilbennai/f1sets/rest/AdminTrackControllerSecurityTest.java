package com.nabilbennai.f1sets.rest;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nabilbennai.f1sets.dao.GameRepository;
import com.nabilbennai.f1sets.model.entities.Game;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminTrackControllerSecurityTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private GameRepository gameRepository;

  @BeforeEach
  void setUp() {
    gameRepository.deleteAll();
    Game game = new Game();
    game.setCode("f12025");
    game.setDisplayName("F1 2025");
    game.setActive(true);
    gameRepository.save(game);
  }

  @Test
  void userRoleIsForbiddenForAdminEndpoint() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/admin/games/f12025/tracks").with(user("user@f1sets.local").roles("USER")))
        .andExpect(status().isForbidden());
  }

  @Test
  void adminRoleCanAccessAdminEndpoint() throws Exception {
    mockMvc
        .perform(
            get("/api/v1/admin/games/f12025/tracks")
                .with(user("admin@f1sets.local").roles("ADMIN")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.gameCode").value("f12025"));
  }
}
