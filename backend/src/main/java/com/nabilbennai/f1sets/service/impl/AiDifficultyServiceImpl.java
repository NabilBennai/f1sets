package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.dao.AiDifficultyCurveRepository;
import com.nabilbennai.f1sets.dao.GameRepository;
import com.nabilbennai.f1sets.dao.TrackRepository;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import com.nabilbennai.f1sets.model.dto.aidifficulty.AiDifficultyCalculationResponseDto;
import com.nabilbennai.f1sets.model.dto.aidifficulty.AiDifficultyCurveResponseDto;
import com.nabilbennai.f1sets.model.entities.AiDifficultyCurve;
import com.nabilbennai.f1sets.model.entities.Game;
import com.nabilbennai.f1sets.model.entities.Track;
import com.nabilbennai.f1sets.service.AiDifficultyService;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AiDifficultyServiceImpl implements AiDifficultyService {

  private static final int DEFAULT_CONFIDENCE_BAND_DELTA = 2;

  private final GameRepository gameRepository;
  private final TrackRepository trackRepository;
  private final AiDifficultyCurveRepository curveRepository;

  @Value("${app.ai-difficulty.min:0}")
  private int minDifficulty;

  @Value("${app.ai-difficulty.max:110}")
  private int maxDifficulty;

  @Value("${app.ai-difficulty.max-lap-time-ms:600000}")
  private long maxLapTimeMs;

  public AiDifficultyServiceImpl(
      GameRepository gameRepository,
      TrackRepository trackRepository,
      AiDifficultyCurveRepository curveRepository) {
    this.gameRepository = gameRepository;
    this.trackRepository = trackRepository;
    this.curveRepository = curveRepository;
  }

  @Override
  public AiDifficultyCurveResponseDto getCurve(String gameCode, String trackSlug) {
    CurveContext context = resolveCurveContext(gameCode, trackSlug);
    AiDifficultyCurve curve = context.curve();

    return new AiDifficultyCurveResponseDto(
        context.game().getCode(),
        context.track().getSlug(),
        curve.getSlope(),
        curve.getIntercept(),
        curve.getEsportsRefTimeMs(),
        curve.getAvgRefTimeMs(),
        curve.getVersion(),
        curve.getSource());
  }

  @Override
  public AiDifficultyCalculationResponseDto calculate(
      String gameCode, String trackSlug, Long lapTimeMs) {
    if (lapTimeMs == null || lapTimeMs <= 0) {
      throw new IllegalArgumentException("lapTimeMs must be greater than 0");
    }
    if (lapTimeMs > maxLapTimeMs) {
      throw new IllegalArgumentException(
          "lapTimeMs must be lower than or equal to " + maxLapTimeMs);
    }

    CurveContext context = resolveCurveContext(gameCode, trackSlug);
    AiDifficultyCurve curve = context.curve();

    double lapTimeSeconds = lapTimeMs / 1000d;
    double rawDifficulty = curve.getSlope() * lapTimeSeconds + curve.getIntercept();
    int roundedDifficulty = (int) Math.round(rawDifficulty);
    int clampedDifficulty = clamp(roundedDifficulty, minDifficulty, maxDifficulty);

    int confidenceMin =
        clamp(clampedDifficulty - DEFAULT_CONFIDENCE_BAND_DELTA, minDifficulty, maxDifficulty);
    int confidenceMax =
        clamp(clampedDifficulty + DEFAULT_CONFIDENCE_BAND_DELTA, minDifficulty, maxDifficulty);

    String notes = "Calculated using Equal Performance Time Trial curve";
    if (roundedDifficulty != clampedDifficulty) {
      notes += " (clamped to configured range)";
    }

    return new AiDifficultyCalculationResponseDto(
        clampedDifficulty,
        new AiDifficultyCalculationResponseDto.ConfidenceBandDto(confidenceMin, confidenceMax),
        curve.getVersion(),
        notes);
  }

  private CurveContext resolveCurveContext(String gameCode, String trackSlug) {
    String normalizedGameCode = normalizeCode(gameCode);
    String normalizedTrackSlug = normalizeCode(trackSlug);

    Game game =
        gameRepository
            .findByCodeAndIsActiveTrue(normalizedGameCode)
            .orElseThrow(() -> new NotFoundException("Game not found"));
    Track track =
        trackRepository
            .findByGameAndSlug(game, normalizedTrackSlug)
            .orElseThrow(() -> new NotFoundException("Track not found"));
    AiDifficultyCurve curve =
        curveRepository
            .findByGameIdAndTrackId(game.getId(), track.getId())
            .orElseThrow(() -> new NotFoundException("AI difficulty curve not found"));

    return new CurveContext(game, track, curve);
  }

  private String normalizeCode(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private int clamp(int value, int min, int max) {
    return Math.min(max, Math.max(min, value));
  }

  private record CurveContext(Game game, Track track, AiDifficultyCurve curve) {}
}
