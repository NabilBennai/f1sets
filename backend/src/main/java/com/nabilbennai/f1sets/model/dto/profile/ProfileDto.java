package com.nabilbennai.f1sets.model.dto.profile;

import com.nabilbennai.f1sets.model.enums.Visibility;
import java.time.LocalDate;
import java.util.List;

public record ProfileDto(
    Long userId,
    String displayName,
    String email,
    String firstName,
    String lastName,
    LocalDate dateOfBirth,
    String country,
    List<String> languages,
    Visibility visibility,
    String avatarUrl,
    boolean owner) {}
