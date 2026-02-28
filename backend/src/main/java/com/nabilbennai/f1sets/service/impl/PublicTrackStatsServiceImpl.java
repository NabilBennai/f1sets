package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.dao.AiDifficultyCurveRepository;
import com.nabilbennai.f1sets.dao.LapRepository;
import com.nabilbennai.f1sets.dao.SetupRepository;
import com.nabilbennai.f1sets.service.PublicTrackStatsService;
import org.springframework.stereotype.Service;

@Service
public class PublicTrackStatsServiceImpl implements PublicTrackStatsService {

  private final SetupRepository setupRepository;
  private final LapRepository lapRepository;
  private final AiDifficultyCurveRepository curveRepository;

  public PublicTrackStatsServiceImpl(
      SetupRepository setupRepository,
      LapRepository lapRepository,
      AiDifficultyCurveRepository curveRepository) {
    this.setupRepository = setupRepository;
    this.lapRepository = lapRepository;
    this.curveRepository = curveRepository;
  }

  @Override
  public boolean hasSetups(Long gameId, Long trackId) {
    return setupRepository.existsByGameIdAndTrackIdAndDeletedAtIsNull(gameId, trackId);
  }

  @Override
  public boolean hasLeaderboard(Long gameId, Long trackId) {
    return lapRepository.existsValidTimeTrialLap(gameId, trackId);
  }

  @Override
  public boolean hasAiDifficulty(Long gameId, Long trackId) {
    return curveRepository.existsByGameIdAndTrackId(gameId, trackId);
  }
}
