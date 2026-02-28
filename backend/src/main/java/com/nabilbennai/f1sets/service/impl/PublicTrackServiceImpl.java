package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.config.MinioProperties;
import com.nabilbennai.f1sets.dao.GameRepository;
import com.nabilbennai.f1sets.dao.TrackRepository;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import com.nabilbennai.f1sets.model.dto.TrackListItemDto;
import com.nabilbennai.f1sets.model.dto.TrackListResponseDto;
import com.nabilbennai.f1sets.model.entities.Game;
import com.nabilbennai.f1sets.model.entities.Track;
import com.nabilbennai.f1sets.service.PublicTrackService;
import com.nabilbennai.f1sets.service.PublicTrackStatsService;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional(readOnly = true)
public class PublicTrackServiceImpl implements PublicTrackService {

  private final GameRepository gameRepository;
  private final TrackRepository trackRepository;
  private final PublicTrackStatsService statsService;
  private final MinioProperties minioProperties;

  @Value("${app.backend-url:http://localhost:8080}")
  private String backendUrl;

  public PublicTrackServiceImpl(
      GameRepository gameRepository,
      TrackRepository trackRepository,
      PublicTrackStatsService statsService,
      MinioProperties minioProperties) {
    this.gameRepository = gameRepository;
    this.trackRepository = trackRepository;
    this.statsService = statsService;
    this.minioProperties = minioProperties;
  }

  @Override
  public TrackListResponseDto getTracksByGame(
      String gameCode,
      String query,
      Boolean hasSetups,
      Boolean hasLeaderboard,
      Boolean hasAiDifficulty,
      String sort,
      int page,
      int size) {
    String normalizedGameCode = gameCode.trim().toLowerCase(Locale.ROOT);
    int normalizedPage = Math.max(page, 0);
    int normalizedSize = Math.min(Math.max(size, 1), 100);

    Game game =
        gameRepository
            .findByCodeAndIsActiveTrue(normalizedGameCode)
            .orElseThrow(() -> new NotFoundException("Game not found"));

    List<Track> tracks = trackRepository.findAllByGameOrderByName(game);

    List<TrackListItemDto> mappedItems =
        tracks.stream()
            .map(
                track ->
                    new TrackListItemDto(
                        track.getId(),
                        track.getSlug(),
                        track.getGrandPrixName(),
                        track.getCircuitName(),
                        track.getLengthKm(),
                        statsService.hasSetups(game.getId(), track.getId()),
                        statsService.hasLeaderboard(game.getId(), track.getId()),
                        statsService.hasAiDifficulty(game.getId(), track.getId()),
                        resolveTrackImageUrl(track.getTrackImageUrl())))
            .toList();

    List<TrackListItemDto> filteredItems =
        applyServerFilters(mappedItems, query, hasSetups, hasLeaderboard, hasAiDifficulty);
    List<TrackListItemDto> sortedItems = applySort(filteredItems, sort);

    int totalTracks = sortedItems.size();
    int fromIndex = Math.min(normalizedPage * normalizedSize, totalTracks);
    int toIndex = Math.min(fromIndex + normalizedSize, totalTracks);
    List<TrackListItemDto> pageItems = sortedItems.subList(fromIndex, toIndex);
    int totalPages = totalTracks == 0 ? 0 : (int) Math.ceil((double) totalTracks / normalizedSize);

    return new TrackListResponseDto(
        normalizedGameCode, pageItems, normalizedPage, normalizedSize, totalTracks, totalPages);
  }

  private String resolveTrackImageUrl(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }

    String normalized = value.trim();
    if (normalized.contains("/api/v1/resources/")) {
      return normalized;
    }

    if (normalized.startsWith("tracks/")) {
      return buildResourceUrl(normalized);
    }

    String minioPrefix =
        minioProperties.url().replaceAll("/$", "") + "/" + minioProperties.bucket() + "/";
    if (normalized.startsWith(minioPrefix)) {
      return buildResourceUrl(normalized.substring(minioPrefix.length()));
    }

    return normalized;
  }

  private String buildResourceUrl(String objectKey) {
    return backendUrl.replaceAll("/$", "") + "/api/v1/resources/" + objectKey;
  }

  private List<TrackListItemDto> applyServerFilters(
      List<TrackListItemDto> items,
      String query,
      Boolean hasSetups,
      Boolean hasLeaderboard,
      Boolean hasAiDifficulty) {
    String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
    return items.stream()
        .filter(
            item -> {
              if (!StringUtils.hasText(normalizedQuery)) {
                return true;
              }
              String haystack =
                  ((item.grandPrixName() == null ? "" : item.grandPrixName())
                          + " "
                          + (item.circuitName() == null ? "" : item.circuitName())
                          + " "
                          + (item.slug() == null ? "" : item.slug()))
                      .toLowerCase(Locale.ROOT);
              return haystack.contains(normalizedQuery);
            })
        .filter(item -> hasSetups == null || !hasSetups || item.hasSetups())
        .filter(item -> hasLeaderboard == null || !hasLeaderboard || item.hasLeaderboard())
        .filter(item -> hasAiDifficulty == null || !hasAiDifficulty || item.hasAiDifficulty())
        .toList();
  }

  private List<TrackListItemDto> applySort(List<TrackListItemDto> items, String sort) {
    Comparator<TrackListItemDto> comparator;
    String normalizedSort = sort == null ? "name" : sort.trim().toLowerCase(Locale.ROOT);
    comparator =
        switch (normalizedSort) {
          case "length_asc" ->
              Comparator.comparing(
                  TrackListItemDto::lengthKm, Comparator.nullsLast(Comparator.naturalOrder()));
          case "length_desc" ->
              Comparator.comparing(
                  TrackListItemDto::lengthKm, Comparator.nullsLast(Comparator.reverseOrder()));
          case "slug" ->
              Comparator.comparing(TrackListItemDto::slug, String.CASE_INSENSITIVE_ORDER);
          default ->
              Comparator.comparing(
                  item -> item.grandPrixName() == null ? item.slug() : item.grandPrixName(),
                  String.CASE_INSENSITIVE_ORDER);
        };
    return items.stream().sorted(comparator).toList();
  }
}
