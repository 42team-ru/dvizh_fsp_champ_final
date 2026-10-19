package com.hackathon.app.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "Отказ по заявке; тело можно не передавать")
public record RejectRegistrationRequest(
		@Schema(description = "Причина отказа; участник увидит её в своей записи", example = "Группа уже набрана")
		@Size(max = 1000) String reason) {
}
