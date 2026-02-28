package com.nabilbennai.f1sets.model.dto.setup;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SaveSetupFieldSchemaRequestDto(
    @NotNull(message = "fields is required") List<@Valid SetupFieldDefinitionDto> fields) {}
