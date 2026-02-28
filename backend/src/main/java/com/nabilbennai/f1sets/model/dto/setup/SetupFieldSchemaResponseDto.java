package com.nabilbennai.f1sets.model.dto.setup;

import java.util.List;

public record SetupFieldSchemaResponseDto(String gameCode, List<SetupFieldDefinitionDto> fields) {}
