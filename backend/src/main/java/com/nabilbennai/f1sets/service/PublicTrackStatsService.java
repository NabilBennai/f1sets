package com.nabilbennai.f1sets.service;

public interface PublicTrackStatsService {

  boolean hasSetups(Long gameId, Long trackId);

  boolean hasLeaderboard(Long gameId, Long trackId);

  boolean hasAiDifficulty(Long gameId, Long trackId);
}
