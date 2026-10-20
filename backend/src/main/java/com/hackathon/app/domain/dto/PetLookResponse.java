package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;

/** Публичный образ бобра без личного состояния и причин настроения. */
public record PetLookResponse(
        @Schema(description = "Имя питомца; по умолчанию Бублик", requiredMode = REQUIRED) String name,
        @Schema(description = "Инвентарь; none — без инвентаря", requiredMode = REQUIRED) String activity,
        @Schema(description = "Надетые вещи по кодам слотов", requiredMode = REQUIRED) Map<String, String> outfit) {
}
