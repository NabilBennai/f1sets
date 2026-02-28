package com.nabilbennai.f1sets.service;

import org.springframework.web.multipart.MultipartFile;

public interface TrackPhotoStorageService {

  String storeTrackPhoto(Long trackId, MultipartFile file);

  void deleteTrackPhoto(String objectKey);
}
