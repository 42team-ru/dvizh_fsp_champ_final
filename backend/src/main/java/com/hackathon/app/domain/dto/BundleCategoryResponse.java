package com.hackathon.app.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/** Спортивная категория готовых образов. */
public record BundleCategoryResponse(
        /** Стабильный код для фильтра. */
        @Schema(description = "Код категории.", requiredMode = REQUIRED) String code,
        /** Русское название категории. */
        @Schema(description = "Название категории.", requiredMode = REQUIRED) String label) {}
