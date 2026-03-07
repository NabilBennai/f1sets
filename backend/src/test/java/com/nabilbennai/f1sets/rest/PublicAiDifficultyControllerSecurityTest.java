package com.nabilbennai.f1sets.rest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nabilbennai.f1sets.dao.AiDifficultyCurveRepository;
import com.nabilbennai.f1sets.dao.GameRepository;
import com.nabilbennai.f1sets.dao.TrackRepository;
import com.nabilbennai.f1sets.model.entities.AiDifficultyCurve;
import com.nabilbennai.f1sets.model.entities.Game;
import com.nabilbennai.f1sets.model.entities.Track;
import java.math.BigDecimal;
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
class PublicAiDifficultyControllerSecurityTest {

  @Autowired private MockMvc mockMvc;
  @Autowired private AiDifficultyCurveRepository curveRepository;
  @Autowired private TrackRepository trackRepository;
  @Autowired private GameRepository gameRepository;

  @BeforeEach
  void setUp() {
    curveRepository.deleteAll();
    trackRepository.deleteAll();
    gameRepository.deleteAll();

    Game game = new Game();
    game.setCode("f12025");
    game.setDisplayName("F1 2025");
    game.setActive(true);
    Game savedGame = gameRepository.save(game);

    Track track = new Track();
    track.setGame(savedGame);
    track.setSlug("australia");
    track.setGrandPrixName("Australia");
    track.setCircuitName("Albert Park");
    track.setLengthKm(new BigDecimal("5.278"));
    Track savedTrack = trackRepository.save(track);

    AiDifficultyCurve curve = new AiDifficultyCurve();
    curve.setGameId(savedGame.getId());
    curve.setTrackId(savedTrack.getId());
    curve.setSlope(-1.7288);
    curve.setIntercept(227.78);
    curve.setEsportsRefTimeMs(73915);
    curve.setAvgRefTimeMs(85484);
    curve.setSource("f1laps.com");
    curve.setVersion(3);
    curveRepository.save(curve);
  }

  @Test
  void anonymousUserCanReadPublicCurve() throws Exception {
    mockMvc
        .perform(get("/api/v1/public/ai-difficulty/f12025/australia/curve"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.gameCode").value("f12025"))
        .andExpect(jsonPath("$.trackSlug").value("australia"));
  }

  @Test
  void anonymousUserCanCalculatePublicAiDifficulty() throws Exception {
    mockMvc
        .perform(
            post("/api/v1/public/ai-difficulty/f12025/australia/calculate")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"lapTimeMs\":73915}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.difficulty").isNumber())
        .andExpect(jsonPath("$.confidence.min").isNumber())
        .andExpect(jsonPath("$.confidence.max").isNumber());
  }
}
