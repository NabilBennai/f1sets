package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.TrackListResponseDto;

public interface PublicTrackService {

  TrackListResponseDto getTracksByGame(
      String gameCode,
      String query,
      Boolean hasSetups,
      Boolean hasLeaderboard,
      Boolean hasAiDifficulty,
      String sort,
      int page,
      int size);
}
