package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.aidifficulty.AiDifficultyCalculationResponseDto;
import com.nabilbennai.f1sets.model.dto.aidifficulty.AiDifficultyCurveResponseDto;

public interface AiDifficultyService {

  AiDifficultyCurveResponseDto getCurve(String gameCode, String trackSlug);

  AiDifficultyCalculationResponseDto calculate(String gameCode, String trackSlug, Long lapTimeMs);
}
