package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Отключение или отклонение вида спорта")
public record HideSportRequest(
		@Schema(description = "Причина для админов и автора предложения", example = "Не вид спорта",
				requiredMode = REQUIRED)
		@NotBlank @Size(max = 1000) String reason) {
}
