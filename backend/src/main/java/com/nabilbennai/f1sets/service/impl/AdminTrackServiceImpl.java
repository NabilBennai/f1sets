package com.nabilbennai.f1sets.service.impl;

import com.nabilbennai.f1sets.config.MinioProperties;
import com.nabilbennai.f1sets.dao.GameRepository;
import com.nabilbennai.f1sets.dao.TrackRepository;
import com.nabilbennai.f1sets.miscellaneous.NotFoundException;
import com.nabilbennai.f1sets.model.dto.admin.AdminTrackDto;
import com.nabilbennai.f1sets.model.dto.admin.AdminTrackListResponseDto;
import com.nabilbennai.f1sets.model.dto.admin.CreateTrackRequestDto;
import com.nabilbennai.f1sets.model.dto.admin.TrackPhotoResponseDto;
import com.nabilbennai.f1sets.model.dto.admin.UpdateTrackRequestDto;
import com.nabilbennai.f1sets.model.entities.Game;
import com.nabilbennai.f1sets.model.entities.Track;
import com.nabilbennai.f1sets.service.AdminTrackService;
import com.nabilbennai.f1sets.service.TrackPhotoStorageService;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class AdminTrackServiceImpl implements AdminTrackService {

  private final GameRepository gameRepository;
  private final TrackRepository trackRepository;
  private final TrackPhotoStorageService trackPhotoStorageService;
  private final MinioProperties minioProperties;

  @Value("${app.backend-url:http://localhost:8080}")
  private String backendUrl;

  @Override
  @Transactional(readOnly = true)
  public AdminTrackListResponseDto getTracksByGame(String gameCode) {
    String normalizedGameCode = normalizeGameCode(gameCode);
    Game game =
        gameRepository
            .findByCode(normalizedGameCode)
            .orElseThrow(() -> new NotFoundException("Game not found"));

    List<AdminTrackDto> tracks =
        trackRepository.findAllByGameOrderByName(game).stream()
            .map(track -> toDto(track, normalizedGameCode))
            .toList();

    return new AdminTrackListResponseDto(normalizedGameCode, tracks);
  }

  @Override
  @Transactional
  public AdminTrackDto createTrack(String gameCode, CreateTrackRequestDto request) {
    String normalizedGameCode = normalizeGameCode(gameCode);
    Game game =
        gameRepository
            .findByCode(normalizedGameCode)
            .orElseThrow(() -> new NotFoundException("Game not found"));

    String normalizedSlug = normalizeSlug(request.slug());
    if (!StringUtils.hasText(normalizedSlug)) {
      throw new IllegalArgumentException("Track slug is required");
    }
    if (trackRepository.existsByGameAndSlug(game, normalizedSlug)) {
      throw new IllegalArgumentException("Track slug already exists for this game");
    }

    Track track = new Track();
    track.setGame(game);
    track.setSlug(normalizedSlug);
    track.setGrandPrixName(trimToNull(request.grandPrixName()));
    track.setCircuitName(trimToNull(request.circuitName()));
    track.setLengthKm(request.lengthKm());
    track.setTrackImageUrl(null);

    Track saved = trackRepository.save(track);
    return toDto(saved, normalizedGameCode);
  }

  @Override
  @Transactional
  public AdminTrackDto updateTrack(Long trackId, UpdateTrackRequestDto request) {
    Track track =
        trackRepository
            .findById(trackId)
            .orElseThrow(() -> new NotFoundException("Track not found"));

    if (StringUtils.hasText(request.slug())) {
      String normalizedSlug = normalizeSlug(request.slug());
      if (!normalizedSlug.equals(track.getSlug())
          && trackRepository.existsByGameAndSlug(track.getGame(), normalizedSlug)) {
        throw new IllegalArgumentException("Track slug already exists for this game");
      }
      track.setSlug(normalizedSlug);
    }
    track.setGrandPrixName(trimToNull(request.grandPrixName()));
    track.setCircuitName(trimToNull(request.circuitName()));
    track.setLengthKm(request.lengthKm());

    Track saved = trackRepository.save(track);
    return toDto(saved, saved.getGame().getCode());
  }

  @Override
  @Transactional
  public void deleteTrack(Long trackId) {
    Track track =
        trackRepository
            .findById(trackId)
            .orElseThrow(() -> new NotFoundException("Track not found"));

    String oldObjectKey = extractObjectKey(track.getTrackImageUrl());
    trackRepository.delete(track);
    if (StringUtils.hasText(oldObjectKey)) {
      trackPhotoStorageService.deleteTrackPhoto(oldObjectKey);
    }
  }

  @Override
  @Transactional
  public TrackPhotoResponseDto uploadTrackPhoto(Long trackId, MultipartFile file) {
    Track track =
        trackRepository
            .findById(trackId)
            .orElseThrow(() -> new NotFoundException("Track not found"));

    String oldObjectKey = extractObjectKey(track.getTrackImageUrl());
    String objectKey = trackPhotoStorageService.storeTrackPhoto(trackId, file);
    track.setTrackImageUrl(objectKey);
    trackRepository.save(track);
    if (StringUtils.hasText(oldObjectKey) && !oldObjectKey.equals(objectKey)) {
      trackPhotoStorageService.deleteTrackPhoto(oldObjectKey);
    }

    return new TrackPhotoResponseDto(buildResourceUrl(objectKey));
  }

  private String normalizeGameCode(String gameCode) {
    return gameCode == null ? "" : gameCode.trim().toLowerCase(Locale.ROOT);
  }

  private String trimToNull(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }
    return value.trim();
  }

  private String normalizeSlug(String slug) {
    return slug == null ? "" : slug.trim().toLowerCase(Locale.ROOT);
  }

  private AdminTrackDto toDto(Track track, String gameCode) {
    return new AdminTrackDto(
        track.getId(),
        gameCode,
        track.getSlug(),
        track.getGrandPrixName(),
        track.getCircuitName(),
        track.getLengthKm(),
        resolveTrackImageUrl(track.getTrackImageUrl()));
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

  private String extractObjectKey(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }

    String normalized = value.trim();
    if (normalized.startsWith("tracks/")) {
      return normalized;
    }

    String resourcePrefix = backendUrl.replaceAll("/$", "") + "/api/v1/resources/";
    if (normalized.startsWith(resourcePrefix)) {
      return normalized.substring(resourcePrefix.length());
    }

    String minioPrefix =
        minioProperties.url().replaceAll("/$", "") + "/" + minioProperties.bucket() + "/";
    if (normalized.startsWith(minioPrefix)) {
      return normalized.substring(minioPrefix.length());
    }

    return null;
  }
}
