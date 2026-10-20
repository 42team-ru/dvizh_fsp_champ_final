package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Исправленный текст своего комментария")
public record BlogCommentUpdateRequest(
		@Schema(description = "Текст", requiredMode = REQUIRED)
		@NotBlank(message = "Напишите комментарий") @Size(max = 2000, message = "Комментарий длиннее 2000 символов") String text) {
}
