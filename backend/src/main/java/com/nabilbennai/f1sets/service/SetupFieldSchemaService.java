package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.setup.SetupFieldDefinitionDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupFieldSchemaResponseDto;
import java.util.List;

public interface SetupFieldSchemaService {

  SetupFieldSchemaResponseDto getSchemaByGameCode(String gameCode);

  SetupFieldSchemaResponseDto saveSchemaByGameCode(
      String gameCode, List<SetupFieldDefinitionDto> fields);
}
