package com.nabilbennai.f1sets.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.nabilbennai.f1sets.dao.AiDifficultyCurveRepository;
import com.nabilbennai.f1sets.dao.GameRepository;
import com.nabilbennai.f1sets.dao.TrackRepository;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import com.nabilbennai.f1sets.model.dto.aidifficulty.AiDifficultyCalculationResponseDto;
import com.nabilbennai.f1sets.model.dto.aidifficulty.AiDifficultyCurveResponseDto;
import com.nabilbennai.f1sets.model.entities.AiDifficultyCurve;
import com.nabilbennai.f1sets.model.entities.Game;
import com.nabilbennai.f1sets.model.entities.Track;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class AiDifficultyServiceImplTest {

  @Mock private GameRepository gameRepository;
  @Mock private TrackRepository trackRepository;
  @Mock private AiDifficultyCurveRepository curveRepository;

  private AiDifficultyServiceImpl service;
  private Game game;
  private Track track;
  private AiDifficultyCurve curve;

  @BeforeEach
  void setUp() {
    service = new AiDifficultyServiceImpl(gameRepository, trackRepository, curveRepository);
    ReflectionTestUtils.setField(service, "minDifficulty", 0);
    ReflectionTestUtils.setField(service, "maxDifficulty", 110);
    ReflectionTestUtils.setField(service, "maxLapTimeMs", 600000L);

    game = new Game();
    game.setId(3L);
    game.setCode("f12025");
    game.setActive(true);

    track = new Track();
    track.setId(8L);
    track.setSlug("australia");

    curve = new AiDifficultyCurve();
    curve.setGameId(3L);
    curve.setTrackId(8L);
    curve.setSlope(-1.7288);
    curve.setIntercept(227.78);
    curve.setEsportsRefTimeMs(73915);
    curve.setAvgRefTimeMs(85484);
    curve.setSource("f1laps.com");
    curve.setVersion(3);
  }

  @Test
  void getCurveReturnsMappedFields() {
    mockCurveLookup();

    AiDifficultyCurveResponseDto response = service.getCurve("f12025", "australia");

    assertEquals("f12025", response.gameCode());
    assertEquals("australia", response.trackSlug());
    assertEquals(-1.7288, response.slope());
    assertEquals(227.78, response.intercept());
    assertEquals(73915, response.esportsRefTimeMs());
    assertEquals(85484, response.avgRefTimeMs());
    assertEquals(3, response.curveVersion());
    assertEquals("f1laps.com", response.source());
  }

  @Test
  void calculateReturnsRoundedDifficultyAndConfidenceBand() {
    mockCurveLookup();

    AiDifficultyCalculationResponseDto response = service.calculate("f12025", "australia", 73915L);

    assertEquals(100, response.difficulty());
    assertEquals(98, response.confidence().min());
    assertEquals(102, response.confidence().max());
    assertEquals(3, response.curveVersion());
  }

  @Test
  void calculateClampsDifficultyToConfiguredBounds() {
    mockCurveLookup();

    AiDifficultyCalculationResponseDto response = service.calculate("f12025", "australia", 1000L);

    assertEquals(110, response.difficulty());
    assertEquals(108, response.confidence().min());
    assertEquals(110, response.confidence().max());
  }

  @Test
  void calculateThrowsWhenCurveDoesNotExist() {
    when(gameRepository.findByCodeAndIsActiveTrue("f12025")).thenReturn(Optional.of(game));
    when(trackRepository.findByGameAndSlug(game, "australia")).thenReturn(Optional.of(track));
    when(curveRepository.findByGameIdAndTrackId(3L, 8L)).thenReturn(Optional.empty());

    assertThrows(NotFoundException.class, () -> service.calculate("f12025", "australia", 73915L));
  }

  @Test
  void calculateRejectsLapTimeOverConfiguredMaximum() {
    assertThrows(
        IllegalArgumentException.class, () -> service.calculate("f12025", "australia", 700000L));
  }

  private void mockCurveLookup() {
    when(gameRepository.findByCodeAndIsActiveTrue("f12025")).thenReturn(Optional.of(game));
    when(trackRepository.findByGameAndSlug(game, "australia")).thenReturn(Optional.of(track));
    when(curveRepository.findByGameIdAndTrackId(3L, 8L)).thenReturn(Optional.of(curve));
  }
}
