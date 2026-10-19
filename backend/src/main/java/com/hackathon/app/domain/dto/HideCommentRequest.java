package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Скрытие сообщения администратором")
public record HideCommentRequest(
		@Schema(description = "Причина: её увидят автор сообщения и администраторы", example = "Оскорбления",
				requiredMode = REQUIRED)
		@NotBlank(message = "Укажите причину") @Size(max = 1000, message = "Причина длиннее 1000 символов") String reason) {
}
