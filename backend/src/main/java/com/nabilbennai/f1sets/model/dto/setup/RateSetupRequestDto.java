package com.nabilbennai.f1sets.model.dto.setup;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record RateSetupRequestDto(
    @Min(value = -1, message = "vote must be -1, 0, or 1") @Max(value = 1, message = "vote must be -1, 0, or 1") int vote) {}
