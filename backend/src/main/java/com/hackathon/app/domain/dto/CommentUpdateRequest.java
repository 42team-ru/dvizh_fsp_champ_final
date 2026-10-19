package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Исправить своё сообщение")
public record CommentUpdateRequest(
		@Schema(description = "Новый текст", example = "Можно прийти без своих шиповок? Размер 43", requiredMode = REQUIRED)
		@NotBlank(message = "Напишите сообщение") @Size(max = 2000, message = "Сообщение длиннее 2000 символов") String text) {
}
