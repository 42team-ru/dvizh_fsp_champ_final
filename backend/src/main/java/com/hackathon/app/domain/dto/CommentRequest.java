package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Новое сообщение в обсуждении мероприятия")
public record CommentRequest(
		@Schema(description = "Текст", example = "Можно прийти без своих шиповок?", requiredMode = REQUIRED)
		@NotBlank(message = "Напишите сообщение") @Size(max = 2000, message = "Сообщение длиннее 2000 символов") String text,
		@Schema(description = "Ответ на сообщение (id); пусто — в общий поток")
		UUID replyToId) {
}
