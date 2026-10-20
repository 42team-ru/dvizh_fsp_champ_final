package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Публичная карточка участника и его бобра на общей поляне. */
public record EventParticipantResponse(
        @Schema(requiredMode = REQUIRED) UUID id,
        @Schema(description = "Логин", requiredMode = REQUIRED) String username,
        @Schema(description = "Имя", requiredMode = REQUIRED) String firstName,
        @Schema(description = "Фамилия", requiredMode = REQUIRED) String lastName,
        @Schema(description = "Ссылка на аватар") String avatarUrl,
        @Schema(description = "Город") String city,
        @Schema(description = "Публичный образ питомца", requiredMode = REQUIRED) PetLookResponse pet) {
}
