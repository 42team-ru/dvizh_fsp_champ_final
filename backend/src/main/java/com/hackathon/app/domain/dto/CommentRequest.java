package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Новый комментарий в обсуждении мероприятия")
public record CommentRequest(
		@Schema(description = "Текст", example = "Можно прийти без своих шиповок?", requiredMode = REQUIRED)
		@NotBlank @Size(max = 2000) String text) {
}
