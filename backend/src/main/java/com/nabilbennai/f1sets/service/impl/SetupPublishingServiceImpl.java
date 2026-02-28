package com.nabilbennai.f1sets.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nabilbennai.f1sets.dao.GameRepository;
import com.nabilbennai.f1sets.dao.SetupFieldDefinitionRepository;
import com.nabilbennai.f1sets.dao.SetupModerationActionRepository;
import com.nabilbennai.f1sets.dao.SetupReportRepository;
import com.nabilbennai.f1sets.dao.SetupRepository;
import com.nabilbennai.f1sets.dao.SetupVoteRepository;
import com.nabilbennai.f1sets.dao.TrackRepository;
import com.nabilbennai.f1sets.dao.UserRepository;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import com.nabilbennai.f1sets.miscellaneous.UnauthorizedException;
import com.nabilbennai.f1sets.model.dto.setup.PublishSetupRequestDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupItemDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupListResponseDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupReportItemDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupReportListResponseDto;
import com.nabilbennai.f1sets.model.dto.setup.UpdateSetupRequestDto;
import com.nabilbennai.f1sets.model.entities.Game;
import com.nabilbennai.f1sets.model.entities.Setup;
import com.nabilbennai.f1sets.model.entities.SetupFieldDefinition;
import com.nabilbennai.f1sets.model.entities.SetupModerationAction;
import com.nabilbennai.f1sets.model.entities.SetupReport;
import com.nabilbennai.f1sets.model.entities.SetupVote;
import com.nabilbennai.f1sets.model.entities.Track;
import com.nabilbennai.f1sets.model.entities.User;
import com.nabilbennai.f1sets.model.enums.SetupFieldType;
import com.nabilbennai.f1sets.model.enums.UserRole;
import com.nabilbennai.f1sets.service.SetupPublishingService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class SetupPublishingServiceImpl implements SetupPublishingService {

  private final SetupRepository setupRepository;
  private final GameRepository gameRepository;
  private final TrackRepository trackRepository;
  private final UserRepository userRepository;
  private final SetupFieldDefinitionRepository setupFieldDefinitionRepository;
  private final SetupVoteRepository setupVoteRepository;
  private final SetupReportRepository setupReportRepository;
  private final SetupModerationActionRepository setupModerationActionRepository;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional
  public SetupItemDto publishSetup(String authenticatedEmail, PublishSetupRequestDto request) {
    User user = getAuthenticatedUser(authenticatedEmail);

    String normalizedGameCode = normalizeCode(request.gameCode());
    String normalizedTrackSlug = normalizeCode(request.trackSlug());

    Game game =
        gameRepository
            .findByCodeAndIsActiveTrue(normalizedGameCode)
            .orElseThrow(() -> new NotFoundException("Game not found"));
    Track track =
        trackRepository
            .findByGameAndSlug(game, normalizedTrackSlug)
            .orElseThrow(() -> new NotFoundException("Track not found"));

    Map<String, Object> normalizedValues =
        normalizeAndValidateSetupValues(game, request.setupValues());

    Setup setup = new Setup();
    setup.setGameId(game.getId());
    setup.setTrackId(track.getId());
    setup.setUserId(user.getId());
    setup.setTitle(request.title().trim());
    setup.setNotes(trimToNull(request.notes()));
    setup.setSessionType(normalizeOptionalCode(request.sessionType()));
    setup.setWeatherCondition(normalizeOptionalCode(request.weatherCondition()));
    setup.setAssistsPreset(normalizeOptionalCode(request.assistsPreset()));
    setup.setInputDevice(normalizeOptionalCode(request.inputDevice()));
    setup.setFuelLoadKg(normalizeFuelLoad(request.fuelLoadKg()));
    setup.setTyreCompound(normalizeOptionalCode(request.tyreCompound()));
    setup.setSetupData(writeSetupValuesJson(normalizedValues));
    setup.setDeletedAt(null);
    setup.setHidden(false);

    Setup saved = setupRepository.save(setup);
    return toDto(saved, normalizedGameCode, normalizedTrackSlug, Map.of(), Map.of());
  }

  @Override
  @Transactional
  public SetupItemDto updateSetup(
      String authenticatedEmail, Long setupId, UpdateSetupRequestDto request) {
    User user = getAuthenticatedUser(authenticatedEmail);
    Setup setup =
        setupRepository
            .findByIdAndDeletedAtIsNull(setupId)
            .orElseThrow(() -> new NotFoundException("Setup not found"));

    assertCanModifySetup(user, setup);
    Map<String, Object> normalizedValues =
        normalizeAndValidateSetupValuesByGameId(setup.getGameId(), request.setupValues());

    setup.setTitle(request.title().trim());
    setup.setNotes(trimToNull(request.notes()));
    setup.setSessionType(normalizeOptionalCode(request.sessionType()));
    setup.setWeatherCondition(normalizeOptionalCode(request.weatherCondition()));
    setup.setAssistsPreset(normalizeOptionalCode(request.assistsPreset()));
    setup.setInputDevice(normalizeOptionalCode(request.inputDevice()));
    setup.setFuelLoadKg(normalizeFuelLoad(request.fuelLoadKg()));
    setup.setTyreCompound(normalizeOptionalCode(request.tyreCompound()));
    setup.setSetupData(writeSetupValuesJson(normalizedValues));

    Setup saved = setupRepository.save(setup);
    String gameCode =
        gameRepository.findById(saved.getGameId()).map(Game::getCode).orElse("unknown");
    String trackSlug =
        trackRepository.findById(saved.getTrackId()).map(Track::getSlug).orElse("unknown");

    UserVoteAndStats voteAndStats = resolveVoteAndStats(List.of(saved), user.getId());
    return toDto(
        saved,
        gameCode,
        trackSlug,
        voteAndStats.userVoteBySetupId(),
        voteAndStats.statsBySetupId());
  }

  @Override
  @Transactional
  public void deleteSetup(String authenticatedEmail, Long setupId) {
    User user = getAuthenticatedUser(authenticatedEmail);
    Setup setup =
        setupRepository
            .findByIdAndDeletedAtIsNull(setupId)
            .orElseThrow(() -> new NotFoundException("Setup not found"));

    assertCanModifySetup(user, setup);
    setup.setDeletedAt(Instant.now());
    setupRepository.save(setup);
  }

  @Override
  @Transactional(readOnly = true)
  public SetupListResponseDto searchSetups(
      String gameCode,
      String trackSlug,
      String query,
      String sessionType,
      String weatherCondition,
      String inputDevice,
      int page,
      int size) {
    String normalizedGameCode = StringUtils.hasText(gameCode) ? normalizeCode(gameCode) : null;
    String normalizedTrackSlug = StringUtils.hasText(trackSlug) ? normalizeCode(trackSlug) : null;
    String normalizedQuery =
        StringUtils.hasText(query) ? query.trim().toLowerCase(Locale.ROOT) : null;
    String normalizedSessionType =
        StringUtils.hasText(sessionType) ? normalizeCode(sessionType) : null;
    String normalizedWeatherCondition =
        StringUtils.hasText(weatherCondition) ? normalizeCode(weatherCondition) : null;
    String normalizedInputDevice =
        StringUtils.hasText(inputDevice) ? normalizeCode(inputDevice) : null;

    int normalizedPage = Math.max(page, 0);
    int normalizedSize = Math.min(Math.max(size, 1), 100);

    if (normalizedGameCode != null) {
      gameRepository
          .findByCodeAndIsActiveTrue(normalizedGameCode)
          .orElseThrow(() -> new NotFoundException("Game not found"));
    }

    Page<Setup> setupPage =
        setupRepository.searchActiveSetups(
            normalizedGameCode,
            normalizedTrackSlug,
            normalizedQuery,
            normalizedSessionType,
            normalizedWeatherCondition,
            normalizedInputDevice,
            PageRequest.of(
                normalizedPage, normalizedSize, Sort.by(Sort.Direction.DESC, "createdAt")));

    Map<Long, String> gameCodeById = resolveGameCodes(setupPage.getContent());
    Map<Long, String> trackSlugById = resolveTrackSlugs(setupPage.getContent());
    UserVoteAndStats voteAndStats = resolveVoteAndStats(setupPage.getContent(), null);

    List<SetupItemDto> items =
        setupPage.getContent().stream()
            .map(
                setup ->
                    toDto(
                        setup,
                        gameCodeById.getOrDefault(setup.getGameId(), "unknown"),
                        trackSlugById.getOrDefault(setup.getTrackId(), "unknown"),
                        voteAndStats.userVoteBySetupId(),
                        voteAndStats.statsBySetupId()))
            .toList();

    return new SetupListResponseDto(
        normalizedGameCode,
        normalizedTrackSlug,
        normalizedQuery,
        normalizedSessionType,
        normalizedWeatherCondition,
        normalizedInputDevice,
        setupPage.getNumber(),
        setupPage.getSize(),
        setupPage.getTotalElements(),
        setupPage.getTotalPages(),
        items);
  }

  @Override
  @Transactional
  public SetupItemDto rateSetup(String authenticatedEmail, Long setupId, int vote) {
    User user = getAuthenticatedUser(authenticatedEmail);
    if (vote < -1 || vote > 1) {
      throw new IllegalArgumentException("vote must be -1, 0, or 1");
    }

    Setup setup =
        setupRepository
            .findByIdAndDeletedAtIsNull(setupId)
            .orElseThrow(() -> new NotFoundException("Setup not found"));
    if (setup.isHidden()) {
      throw new AccessDeniedException("Hidden setup cannot be rated");
    }

    SetupVote existing =
        setupVoteRepository.findBySetupIdAndUserId(setupId, user.getId()).orElse(null);
    if (vote == 0) {
      if (existing != null) {
        setupVoteRepository.delete(existing);
      }
    } else if (existing == null) {
      setupVoteRepository.save(new SetupVote(null, setupId, user.getId(), vote, null, null));
    } else {
      existing.setVoteValue(vote);
      setupVoteRepository.save(existing);
    }

    String gameCode =
        gameRepository.findById(setup.getGameId()).map(Game::getCode).orElse("unknown");
    String trackSlug =
        trackRepository.findById(setup.getTrackId()).map(Track::getSlug).orElse("unknown");
    UserVoteAndStats voteAndStats = resolveVoteAndStats(List.of(setup), user.getId());
    return toDto(
        setup,
        gameCode,
        trackSlug,
        voteAndStats.userVoteBySetupId(),
        voteAndStats.statsBySetupId());
  }

  @Override
  @Transactional
  public SetupReportItemDto reportSetup(String authenticatedEmail, Long setupId, String reason) {
    User user = getAuthenticatedUser(authenticatedEmail);
    Setup setup =
        setupRepository
            .findByIdAndDeletedAtIsNull(setupId)
            .orElseThrow(() -> new NotFoundException("Setup not found"));
    if (setup.isHidden()) {
      throw new AccessDeniedException("Hidden setup cannot be reported");
    }

    String normalizedReason = trimToNull(reason);
    if (normalizedReason == null) {
      throw new IllegalArgumentException("reason is required");
    }

    SetupReport existing =
        setupReportRepository
            .findBySetupIdAndReporterIdAndStatus(setupId, user.getId(), "OPEN")
            .orElse(null);
    if (existing != null) {
      return toDto(existing);
    }

    SetupReport report = new SetupReport();
    report.setSetupId(setupId);
    report.setReporterId(user.getId());
    report.setReason(normalizedReason);
    report.setStatus("OPEN");
    SetupReport saved = setupReportRepository.save(report);
    return toDto(saved);
  }

  @Override
  @Transactional(readOnly = true)
  public List<SetupItemDto> getRecommendedSetups(
      String authenticatedEmail, String gameCode, int limit) {
    User user = getAuthenticatedUser(authenticatedEmail);

    int normalizedLimit = Math.min(Math.max(limit, 1), 20);
    String normalizedGameCode = StringUtils.hasText(gameCode) ? normalizeCode(gameCode) : null;

    List<Setup> userRecent =
        setupRepository.findByUserIdAndDeletedAtIsNullAndHiddenFalseOrderByCreatedAtDesc(
            user.getId(), PageRequest.of(0, 5));

    String recommendedGameCode = normalizedGameCode;
    String recommendedTrackSlug = null;
    String sessionType = null;
    String weatherCondition = null;
    String inputDevice = null;

    if (!userRecent.isEmpty()) {
      Setup latest = userRecent.get(0);
      if (recommendedGameCode == null) {
        recommendedGameCode =
            gameRepository.findById(latest.getGameId()).map(Game::getCode).orElse(null);
      }
      recommendedTrackSlug =
          trackRepository.findById(latest.getTrackId()).map(Track::getSlug).orElse(null);
      sessionType = latest.getSessionType();
      weatherCondition = latest.getWeatherCondition();
      inputDevice = latest.getInputDevice();
    }

    Page<Setup> page =
        setupRepository.searchActiveSetups(
            recommendedGameCode,
            recommendedTrackSlug,
            null,
            sessionType,
            weatherCondition,
            inputDevice,
            PageRequest.of(
                0, Math.max(normalizedLimit * 3, 10), Sort.by(Sort.Direction.DESC, "createdAt")));

    List<Setup> candidates =
        page.getContent().stream()
            .filter(setup -> !Objects.equals(setup.getUserId(), user.getId()))
            .collect(Collectors.toCollection(ArrayList::new));

    if (candidates.size() < normalizedLimit) {
      Page<Setup> fallback =
          setupRepository.searchActiveSetups(
              recommendedGameCode,
              null,
              null,
              null,
              null,
              null,
              PageRequest.of(0, normalizedLimit * 3, Sort.by(Sort.Direction.DESC, "createdAt")));
      fallback.getContent().stream()
          .filter(setup -> !Objects.equals(setup.getUserId(), user.getId()))
          .forEach(candidates::add);
    }

    Map<Long, Setup> deduplicated = new HashMap<>();
    for (Setup setup : candidates) {
      deduplicated.putIfAbsent(setup.getId(), setup);
    }

    List<Setup> shortlisted = new ArrayList<>(deduplicated.values());
    UserVoteAndStats voteAndStats = resolveVoteAndStats(shortlisted, user.getId());
    shortlisted.sort(
        Comparator.<Setup>comparingLong(
                setup ->
                    voteAndStats
                        .statsBySetupId()
                        .getOrDefault(setup.getId(), VoteStats.ZERO)
                        .score())
            .reversed()
            .thenComparing(Setup::getCreatedAt, Comparator.reverseOrder()));

    List<Setup> selected = shortlisted.stream().limit(normalizedLimit).toList();
    Map<Long, String> gameCodeById = resolveGameCodes(selected);
    Map<Long, String> trackSlugById = resolveTrackSlugs(selected);

    return selected.stream()
        .map(
            setup ->
                toDto(
                    setup,
                    gameCodeById.getOrDefault(setup.getGameId(), "unknown"),
                    trackSlugById.getOrDefault(setup.getTrackId(), "unknown"),
                    voteAndStats.userVoteBySetupId(),
                    voteAndStats.statsBySetupId()))
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public SetupReportListResponseDto getReports(String status, int page, int size) {
    String normalizedStatus =
        StringUtils.hasText(status) ? normalizeCode(status).toUpperCase(Locale.ROOT) : "OPEN";
    int normalizedPage = Math.max(page, 0);
    int normalizedSize = Math.min(Math.max(size, 1), 100);

    Page<SetupReport> reportPage =
        setupReportRepository.findByStatusOrderByCreatedAtDesc(
            normalizedStatus, PageRequest.of(normalizedPage, normalizedSize));

    return new SetupReportListResponseDto(
        normalizedStatus,
        reportPage.getNumber(),
        reportPage.getSize(),
        reportPage.getTotalElements(),
        reportPage.getTotalPages(),
        reportPage.getContent().stream().map(this::toDto).toList());
  }

  @Override
  @Transactional
  public SetupItemDto hideSetup(String authenticatedEmail, Long setupId, String reason) {
    User admin = getAuthenticatedUser(authenticatedEmail);
    assertAdmin(admin);

    Setup setup =
        setupRepository
            .findByIdAndDeletedAtIsNull(setupId)
            .orElseThrow(() -> new NotFoundException("Setup not found"));

    String normalizedReason = trimToNull(reason);
    if (normalizedReason == null) {
      throw new IllegalArgumentException("reason is required");
    }

    setup.setHidden(true);
    setup.setHiddenReason(normalizedReason);
    setup.setHiddenAt(Instant.now());
    setup.setHiddenByUserId(admin.getId());
    Setup saved = setupRepository.save(setup);

    saveModerationAction(saved.getId(), admin.getId(), "HIDE", normalizedReason);
    closeOpenReports(saved.getId(), admin.getId());

    String gameCode =
        gameRepository.findById(saved.getGameId()).map(Game::getCode).orElse("unknown");
    String trackSlug =
        trackRepository.findById(saved.getTrackId()).map(Track::getSlug).orElse("unknown");
    UserVoteAndStats voteAndStats = resolveVoteAndStats(List.of(saved), admin.getId());
    return toDto(
        saved,
        gameCode,
        trackSlug,
        voteAndStats.userVoteBySetupId(),
        voteAndStats.statsBySetupId());
  }

  @Override
  @Transactional
  public SetupItemDto unhideSetup(String authenticatedEmail, Long setupId) {
    User admin = getAuthenticatedUser(authenticatedEmail);
    assertAdmin(admin);

    Setup setup =
        setupRepository
            .findByIdAndDeletedAtIsNull(setupId)
            .orElseThrow(() -> new NotFoundException("Setup not found"));

    setup.setHidden(false);
    setup.setHiddenReason(null);
    setup.setHiddenAt(null);
    setup.setHiddenByUserId(null);
    Setup saved = setupRepository.save(setup);

    saveModerationAction(saved.getId(), admin.getId(), "UNHIDE", null);

    String gameCode =
        gameRepository.findById(saved.getGameId()).map(Game::getCode).orElse("unknown");
    String trackSlug =
        trackRepository.findById(saved.getTrackId()).map(Track::getSlug).orElse("unknown");
    UserVoteAndStats voteAndStats = resolveVoteAndStats(List.of(saved), admin.getId());
    return toDto(
        saved,
        gameCode,
        trackSlug,
        voteAndStats.userVoteBySetupId(),
        voteAndStats.statsBySetupId());
  }

  private SetupItemDto toDto(
      Setup setup,
      String gameCode,
      String trackSlug,
      Map<Long, Integer> userVotes,
      Map<Long, VoteStats> statsBySetupId) {
    VoteStats stats = statsBySetupId.getOrDefault(setup.getId(), VoteStats.ZERO);
    Integer userVote = userVotes.get(setup.getId());

    return new SetupItemDto(
        setup.getId(),
        setup.getUserId(),
        gameCode,
        trackSlug,
        setup.getTitle(),
        setup.getNotes(),
        setup.getSessionType(),
        setup.getWeatherCondition(),
        setup.getAssistsPreset(),
        setup.getInputDevice(),
        setup.getFuelLoadKg(),
        setup.getTyreCompound(),
        stats.score(),
        stats.upvotes(),
        stats.downvotes(),
        userVote,
        setup.isHidden(),
        readSetupValuesJson(setup.getSetupData()),
        setup.getCreatedAt());
  }

  private SetupReportItemDto toDto(SetupReport report) {
    return new SetupReportItemDto(
        report.getId(),
        report.getSetupId(),
        report.getReporterId(),
        report.getReason(),
        report.getStatus(),
        report.getCreatedAt(),
        report.getResolvedAt(),
        report.getResolvedBy());
  }

  private User getAuthenticatedUser(String authenticatedEmail) {
    return userRepository
        .findByEmail(normalizeEmail(authenticatedEmail))
        .orElseThrow(() -> new UnauthorizedException("User authentication is required"));
  }

  private void assertCanModifySetup(User user, Setup setup) {
    boolean owner = setup.getUserId() != null && setup.getUserId().equals(user.getId());
    boolean admin = user.getRole() == UserRole.ADMIN;
    if (!owner && !admin) {
      throw new AccessDeniedException("You are not allowed to modify this setup");
    }
  }

  private void assertAdmin(User user) {
    if (user.getRole() != UserRole.ADMIN) {
      throw new AccessDeniedException("Admin role required");
    }
  }

  private void saveModerationAction(
      Long setupId, Long adminUserId, String actionType, String reason) {
    SetupModerationAction action = new SetupModerationAction();
    action.setSetupId(setupId);
    action.setAdminUserId(adminUserId);
    action.setActionType(actionType);
    action.setReason(reason);
    setupModerationActionRepository.save(action);
  }

  private void closeOpenReports(Long setupId, Long adminUserId) {
    Page<SetupReport> openReports =
        setupReportRepository.findByStatusOrderByCreatedAtDesc("OPEN", PageRequest.of(0, 500));
    openReports.getContent().stream()
        .filter(report -> Objects.equals(report.getSetupId(), setupId))
        .forEach(
            report -> {
              report.setStatus("RESOLVED");
              report.setResolvedAt(Instant.now());
              report.setResolvedBy(adminUserId);
              setupReportRepository.save(report);
            });
  }

  private Map<Long, String> resolveGameCodes(List<Setup> setups) {
    Set<Long> gameIds = setups.stream().map(Setup::getGameId).collect(Collectors.toSet());
    if (gameIds.isEmpty()) {
      return Map.of();
    }
    Map<Long, String> values = new HashMap<>();
    gameRepository.findAllById(gameIds).forEach(game -> values.put(game.getId(), game.getCode()));
    return values;
  }

  private Map<Long, String> resolveTrackSlugs(List<Setup> setups) {
    Set<Long> trackIds = setups.stream().map(Setup::getTrackId).collect(Collectors.toSet());
    if (trackIds.isEmpty()) {
      return Map.of();
    }
    Map<Long, String> values = new HashMap<>();
    trackRepository
        .findAllById(trackIds)
        .forEach(track -> values.put(track.getId(), track.getSlug()));
    return values;
  }

  private UserVoteAndStats resolveVoteAndStats(List<Setup> setups, Long userId) {
    if (setups.isEmpty()) {
      return new UserVoteAndStats(Map.of(), Map.of());
    }

    List<Long> setupIds = setups.stream().map(Setup::getId).toList();

    Map<Long, VoteStats> statsBySetupId = new HashMap<>();
    setupVoteRepository
        .findVoteStatsBySetupIds(setupIds)
        .forEach(
            projection -> {
              VoteStats stats =
                  new VoteStats(
                      projection.getScore() == null ? 0 : projection.getScore(),
                      projection.getUpvotes() == null ? 0 : projection.getUpvotes(),
                      projection.getDownvotes() == null ? 0 : projection.getDownvotes());
              statsBySetupId.put(projection.getSetupId(), stats);
            });

    Map<Long, Integer> userVoteBySetupId = new HashMap<>();
    if (userId != null) {
      setupVoteRepository
          .findByUserIdAndSetupIdIn(userId, setupIds)
          .forEach(vote -> userVoteBySetupId.put(vote.getSetupId(), vote.getVoteValue()));
    }

    return new UserVoteAndStats(userVoteBySetupId, statsBySetupId);
  }

  private String normalizeEmail(String email) {
    return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeCode(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }

  private String normalizeOptionalCode(String value) {
    String normalized = normalizeCode(value);
    return StringUtils.hasText(normalized) ? normalized : null;
  }

  private Double normalizeFuelLoad(Double fuelLoadKg) {
    if (fuelLoadKg == null) {
      return null;
    }
    if (fuelLoadKg < 0 || fuelLoadKg > 200) {
      throw new IllegalArgumentException("fuelLoadKg must be between 0 and 200");
    }
    return fuelLoadKg;
  }

  private String trimToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  private Map<String, Object> normalizeAndValidateSetupValues(
      Game game, Map<String, Object> setupValues) {
    return normalizeAndValidateSetupValuesInternal(
        setupFieldDefinitionRepository.findByGameOrderBySortOrderAscFieldLabelAsc(game),
        setupValues);
  }

  private Map<String, Object> normalizeAndValidateSetupValuesByGameId(
      Long gameId, Map<String, Object> setupValues) {
    Game game =
        gameRepository.findById(gameId).orElseThrow(() -> new NotFoundException("Game not found"));
    return normalizeAndValidateSetupValues(game, setupValues);
  }

  private Map<String, Object> normalizeAndValidateSetupValuesInternal(
      List<SetupFieldDefinition> definitions, Map<String, Object> setupValues) {
    if (definitions.isEmpty()) {
      throw new IllegalArgumentException("No setup field schema is defined for this game");
    }
    if (setupValues == null) {
      throw new IllegalArgumentException("setupValues is required");
    }

    Map<String, SetupFieldDefinition> definitionByKey =
        definitions.stream()
            .collect(Collectors.toMap(SetupFieldDefinition::getFieldKey, definition -> definition));

    for (String key : setupValues.keySet()) {
      if (!definitionByKey.containsKey(key)) {
        throw new IllegalArgumentException("Unknown setup field: " + key);
      }
    }

    Map<String, Object> normalized = new HashMap<>();
    for (SetupFieldDefinition definition : definitions) {
      String key = definition.getFieldKey();
      Object rawValue = setupValues.get(key);
      if (rawValue == null) {
        if (definition.isRequired()) {
          throw new IllegalArgumentException("Missing required setup field: " + key);
        }
        continue;
      }

      Object value = normalizeByFieldType(definition, rawValue);
      if (definition.isRequired() && isBlankValue(value)) {
        throw new IllegalArgumentException("Field is required: " + key);
      }
      normalized.put(key, value);
    }

    return normalized;
  }

  private Object normalizeByFieldType(SetupFieldDefinition definition, Object rawValue) {
    SetupFieldType type = definition.getFieldType();
    return switch (type) {
      case TEXT -> rawValue.toString();
      case NUMBER -> normalizeNumber(definition.getFieldKey(), rawValue);
      case BOOLEAN -> normalizeBoolean(definition.getFieldKey(), rawValue);
      case SELECT -> normalizeSelectValue(definition, rawValue);
    };
  }

  private Object normalizeNumber(String key, Object rawValue) {
    if (rawValue instanceof Number number) {
      return number.doubleValue();
    }
    if (rawValue instanceof String text && StringUtils.hasText(text)) {
      try {
        return Double.parseDouble(text.trim());
      } catch (NumberFormatException ignored) {
        throw new IllegalArgumentException("Field must be numeric: " + key);
      }
    }
    throw new IllegalArgumentException("Field must be numeric: " + key);
  }

  private Object normalizeBoolean(String key, Object rawValue) {
    if (rawValue instanceof Boolean value) {
      return value;
    }
    if (rawValue instanceof String text && StringUtils.hasText(text)) {
      if ("true".equalsIgnoreCase(text.trim())) {
        return true;
      }
      if ("false".equalsIgnoreCase(text.trim())) {
        return false;
      }
    }
    throw new IllegalArgumentException("Field must be boolean: " + key);
  }

  private Object normalizeSelectValue(SetupFieldDefinition definition, Object rawValue) {
    String key = definition.getFieldKey();
    String value = rawValue.toString().trim();
    if (!StringUtils.hasText(value)) {
      return value;
    }

    List<String> options = parseSelectOptions(definition.getSelectOptionsJson());
    if (!options.isEmpty()
        && options.stream().noneMatch(option -> option.equalsIgnoreCase(value))) {
      throw new IllegalArgumentException("Invalid option for field: " + key);
    }
    return value;
  }

  private List<String> parseSelectOptions(String rawJson) {
    if (!StringUtils.hasText(rawJson)) {
      return List.of();
    }
    try {
      List<String> values =
          objectMapper.readValue(
              rawJson,
              objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
      return values.stream()
          .filter(Objects::nonNull)
          .map(String::trim)
          .filter(StringUtils::hasText)
          .toList();
    } catch (Exception exception) {
      return List.of();
    }
  }

  private String writeSetupValuesJson(Map<String, Object> setupValues) {
    try {
      return objectMapper.writeValueAsString(setupValues);
    } catch (Exception exception) {
      throw new IllegalArgumentException("setupValues must be valid JSON object");
    }
  }

  private Map<String, Object> readSetupValuesJson(String rawJson) {
    if (!StringUtils.hasText(rawJson)) {
      return Map.of();
    }
    try {
      return objectMapper.readValue(
          rawJson,
          objectMapper.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
    } catch (Exception exception) {
      return Map.of();
    }
  }

  private boolean isBlankValue(Object value) {
    return value instanceof String text && !StringUtils.hasText(text);
  }

  private record VoteStats(long score, long upvotes, long downvotes) {
    static final VoteStats ZERO = new VoteStats(0, 0, 0);
  }

  private record UserVoteAndStats(
      Map<Long, Integer> userVoteBySetupId, Map<Long, VoteStats> statsBySetupId) {}
}
