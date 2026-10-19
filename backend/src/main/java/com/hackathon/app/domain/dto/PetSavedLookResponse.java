package com.hackathon.app.domain.dto;

import java.util.Map;
import java.util.UUID;
import io.swagger.v3.oas.annotations.media.Schema;

/** Сохранённый образ без изменения надетых вещей. */
public record PetSavedLookResponse(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String activity,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Map<String, String> outfit) {}
