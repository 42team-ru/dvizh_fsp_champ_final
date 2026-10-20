package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Новый комментарий под постом")
public record BlogCommentRequest(
		@Schema(description = "Текст", example = "А сколько по времени заняли 8 км?", requiredMode = REQUIRED)
		@NotBlank(message = "Напишите комментарий") @Size(max = 2000, message = "Комментарий длиннее 2000 символов") String text,
		@Schema(description = "Ответ на комментарий (id); пусто — в общий поток")
		UUID replyToId) {
}
