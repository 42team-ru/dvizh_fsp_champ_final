package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Новое название вида спорта")
public record RenameSportRequest(
		@Schema(description = "Название", example = "Пляжный волейбол", requiredMode = REQUIRED)
		@NotBlank @Size(max = 100) String name) {
}
