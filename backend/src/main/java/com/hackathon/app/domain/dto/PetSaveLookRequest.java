package com.hackathon.app.domain.dto;

import java.util.Map;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Именованный образ из своих вещей. */
public record PetSaveLookRequest(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotBlank @Size(max = 30) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull String activity,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull Map<String, String> outfit) {}
