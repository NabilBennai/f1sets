package com.nabilbennai.f1sets.model.dto.setup;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReportSetupRequestDto(
    @NotBlank(message = "reason is required") @Size(max = 255, message = "reason must not exceed 255 characters") String reason) {}
