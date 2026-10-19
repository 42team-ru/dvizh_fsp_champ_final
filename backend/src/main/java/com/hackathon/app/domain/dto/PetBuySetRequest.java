package com.hackathon.app.domain.dto;

import java.util.List;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/** Покупка примеренных вещей с необязательным надеванием. */
public record PetBuySetRequest(
        @Schema(description = "Вещи в формате слот:код", requiredMode = Schema.RequiredMode.REQUIRED)
        @NotEmpty @Size(max = 100) List<@NotBlank String> items,
        @Schema(description = "Добавить купленные вещи к текущему образу", requiredMode = Schema.RequiredMode.REQUIRED)
        boolean wear) {}
