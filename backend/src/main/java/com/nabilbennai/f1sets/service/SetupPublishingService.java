package com.nabilbennai.f1sets.service;

import com.nabilbennai.f1sets.model.dto.setup.PublishSetupRequestDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupItemDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupListResponseDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupReportItemDto;
import com.nabilbennai.f1sets.model.dto.setup.SetupReportListResponseDto;
import com.nabilbennai.f1sets.model.dto.setup.UpdateSetupRequestDto;
import java.util.List;

public interface SetupPublishingService {

  SetupItemDto publishSetup(String authenticatedEmail, PublishSetupRequestDto request);

  SetupItemDto updateSetup(String authenticatedEmail, Long setupId, UpdateSetupRequestDto request);

  void deleteSetup(String authenticatedEmail, Long setupId);

  SetupListResponseDto searchSetups(
      String gameCode,
      String trackSlug,
      String query,
      String sessionType,
      String weatherCondition,
      String inputDevice,
      int page,
      int size);

  SetupItemDto rateSetup(String authenticatedEmail, Long setupId, int vote);

  SetupReportItemDto reportSetup(String authenticatedEmail, Long setupId, String reason);

  List<SetupItemDto> getRecommendedSetups(String authenticatedEmail, String gameCode, int limit);

  SetupReportListResponseDto getReports(String status, int page, int size);

  SetupItemDto hideSetup(String authenticatedEmail, Long setupId, String reason);

  SetupItemDto unhideSetup(String authenticatedEmail, Long setupId);
}
