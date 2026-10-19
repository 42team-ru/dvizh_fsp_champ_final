package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.SystemRole;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Пользователь для администратора")
public record AdminUserResponse(
        @Schema(requiredMode = REQUIRED) UUID id,
        @Schema(requiredMode = REQUIRED) String username,
        @Schema(requiredMode = REQUIRED) String email,
        @Schema(requiredMode = REQUIRED) String firstName,
        @Schema(requiredMode = REQUIRED) String lastName,
        @Schema(requiredMode = REQUIRED) SystemRole systemRole,
        @Schema(requiredMode = REQUIRED) boolean active,
        @Schema(description = "Город") String city,
        @Schema(requiredMode = REQUIRED) Instant createdAt,
        @Schema(description = "Число мероприятий, созданных пользователем", requiredMode = REQUIRED) long eventsCount,
        @Schema(description = "Число подтверждённых записей", requiredMode = REQUIRED) long registrationsCount) {
}
