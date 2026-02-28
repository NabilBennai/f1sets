package com.nabilbennai.f1sets.model.dto.profile;

import com.nabilbennai.f1sets.model.enums.Visibility;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;

public record UpdateProfileRequestDto(
    @Size(max = 100) String firstName,
    @Size(max = 100) String lastName,
    @Past(message = "dateOfBirth must be in the past") LocalDate dateOfBirth,
    @Size(max = 100) String country,
    List<
            @Size(min = 2, max = 32) @Pattern(
                regexp = "^[\\p{L}\\p{N} .+#-]+$",
                message = "language contains unsupported characters")
            String>
        languages,
    Visibility visibility) {}
