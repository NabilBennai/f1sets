package com.nabilbennai.f1sets.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabilbennai.f1sets.dao.GameRepository;
import com.nabilbennai.f1sets.dao.SetupFieldDefinitionRepository;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import com.nabilbennai.f1sets.model.dto.setup.SetupFieldDefinitionDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupFieldSchemaResponseDto;
import com.nabilbennai.f1sets.model.entities.Game;
import com.nabilbennai.f1sets.model.entities.SetupFieldDefinition;
import com.nabilbennai.f1sets.model.enums.SetupFieldType;
import com.nabilbennai.f1sets.service.SetupFieldSchemaService;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class SetupFieldSchemaServiceImpl implements SetupFieldSchemaService {

  private final GameRepository gameRepository;
  private final SetupFieldDefinitionRepository setupFieldDefinitionRepository;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional(readOnly = true)
  public SetupFieldSchemaResponseDto getSchemaByGameCode(String gameCode) {
    Game game = findGameByCode(gameCode);
    List<SetupFieldDefinitionDto> fields =
        setupFieldDefinitionRepository.findByGameOrderBySortOrderAscFieldLabelAsc(game).stream()
            .map(this::toDto)
            .toList();
    return new SetupFieldSchemaResponseDto(game.getCode(), fields);
  }

  @Override
  @Transactional
  public SetupFieldSchemaResponseDto saveSchemaByGameCode(
      String gameCode, List<SetupFieldDefinitionDto> fields) {
    Game game = findGameByCode(gameCode);
    setupFieldDefinitionRepository.deleteByGame(game);

    List<SetupFieldDefinition> entities =
        fields == null ? List.of() : fields.stream().map(field -> toEntity(game, field)).toList();
    if (!entities.isEmpty()) {
      setupFieldDefinitionRepository.saveAll(entities);
    }

    return getSchemaByGameCode(game.getCode());
  }

  private Game findGameByCode(String gameCode) {
    String normalized = gameCode == null ? "" : gameCode.trim().toLowerCase(Locale.ROOT);
    return gameRepository
        .findByCode(normalized)
        .orElseThrow(() -> new NotFoundException("Game not found"));
  }

  private SetupFieldDefinitionDto toDto(SetupFieldDefinition entity) {
    List<String> options = parseOptions(entity.getSelectOptionsJson());
    return new SetupFieldDefinitionDto(
        entity.getFieldKey(),
        entity.getFieldLabel(),
        entity.getFieldType(),
        entity.isRequired(),
        entity.getSortOrder(),
        options);
  }

  private SetupFieldDefinition toEntity(Game game, SetupFieldDefinitionDto field) {
    if (!StringUtils.hasText(field.fieldKey())) {
      throw new IllegalArgumentException("fieldKey is required");
    }
    if (!StringUtils.hasText(field.fieldLabel())) {
      throw new IllegalArgumentException("fieldLabel is required");
    }
    if (field.fieldType() == null) {
      throw new IllegalArgumentException("fieldType is required");
    }

    SetupFieldDefinition entity = new SetupFieldDefinition();
    entity.setGame(game);
    entity.setFieldKey(field.fieldKey().trim().toLowerCase(Locale.ROOT));
    entity.setFieldLabel(field.fieldLabel().trim());
    entity.setFieldType(field.fieldType());
    entity.setRequired(field.required());
    entity.setSortOrder(Math.max(field.sortOrder(), 0));
    entity.setSelectOptionsJson(serializeOptions(field.fieldType(), field.selectOptions()));
    return entity;
  }

  private String serializeOptions(SetupFieldType type, List<String> options) {
    if (type != SetupFieldType.SELECT) {
      return null;
    }
    try {
      List<String> normalized =
          options == null
              ? List.of()
              : options.stream().filter(StringUtils::hasText).map(String::trim).toList();
      return objectMapper.writeValueAsString(normalized);
    } catch (Exception exception) {
      throw new IllegalArgumentException("Invalid select options");
    }
  }

  private List<String> parseOptions(String rawJson) {
    if (!StringUtils.hasText(rawJson)) {
      return List.of();
    }
    try {
      return objectMapper.readValue(rawJson, new TypeReference<>() {});
    } catch (Exception exception) {
      return List.of();
    }
  }
}
