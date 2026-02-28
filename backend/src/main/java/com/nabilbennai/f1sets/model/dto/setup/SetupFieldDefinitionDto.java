package com.nabilbennai.f1sets.model.dto.setup;

import com.nabilbennai.f1sets.model.enums.SetupFieldType;
import java.util.List;

public record SetupFieldDefinitionDto(
    String fieldKey,
    String fieldLabel,
    SetupFieldType fieldType,
    boolean required,
    int sortOrder,
    List<String> selectOptions) {}
