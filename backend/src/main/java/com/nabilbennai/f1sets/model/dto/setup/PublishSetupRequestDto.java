package com.nabilbennai.f1sets.model.dto.setup;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;

public record PublishSetupRequestDto(
    @NotBlank(message = "gameCode is required") @Size(min = 3, max = 20, message = "gameCode must be between 3 and 20 characters") String gameCode,
    @NotBlank(message = "trackSlug is required") @Size(min = 2, max = 64, message = "trackSlug must be between 2 and 64 characters") String trackSlug,
    @NotBlank(message = "title is required") @Size(min = 3, max = 120, message = "title must be between 3 and 120 characters") String title,
    @Size(max = 4000, message = "notes must not exceed 4000 characters") String notes,
    @Size(max = 32, message = "sessionType must not exceed 32 characters") String sessionType,
    @Size(max = 32, message = "weatherCondition must not exceed 32 characters") String weatherCondition,
    @Size(max = 32, message = "assistsPreset must not exceed 32 characters") String assistsPreset,
    @Size(max = 32, message = "inputDevice must not exceed 32 characters") String inputDevice,
    Double fuelLoadKg,
    @Size(max = 32, message = "tyreCompound must not exceed 32 characters") String tyreCompound,
    @NotNull(message = "setupValues is required") Map<String, Object> setupValues) {}
