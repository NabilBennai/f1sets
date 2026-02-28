package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.admin.AdminTrackDto;
import com.nabilbennai.f1sets.model.dto.admin.AdminTrackListResponseDto;
import com.nabilbennai.f1sets.model.dto.admin.CreateTrackRequestDto;
import com.nabilbennai.f1sets.model.dto.admin.TrackPhotoResponseDto;
import com.nabilbennai.f1sets.model.dto.admin.UpdateTrackRequestDto;
import org.springframework.web.multipart.MultipartFile;

public interface AdminTrackService {

  AdminTrackListResponseDto getTracksByGame(String gameCode);

  AdminTrackDto createTrack(String gameCode, CreateTrackRequestDto request);

  AdminTrackDto updateTrack(Long trackId, UpdateTrackRequestDto request);

  void deleteTrack(Long trackId);

  TrackPhotoResponseDto uploadTrackPhoto(Long trackId, MultipartFile file);
}
