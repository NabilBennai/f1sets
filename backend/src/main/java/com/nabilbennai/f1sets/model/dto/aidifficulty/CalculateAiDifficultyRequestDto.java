package com.nabilbennai.f1sets.model.dto.aidifficulty;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CalculateAiDifficultyRequestDto(
    @NotNull(message = "lapTimeMs is required") @Positive(message = "lapTimeMs must be greater than 0") Long lapTimeMs) {}
