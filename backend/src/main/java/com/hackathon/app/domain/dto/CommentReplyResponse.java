package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Цитата сообщения, на которое ответили: как в мессенджере, над текстом ответа. */
@Schema(description = "Сообщение, на которое ответили: автор и начало текста")
public record CommentReplyResponse(
		@Schema(description = "id исходного сообщения — для перехода к нему", requiredMode = REQUIRED) UUID id,
		@Schema(description = "Автор исходного сообщения", requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "Начало текста (до 140 символов); null — сообщение удалено") String text,
		@Schema(description = "Исходное сообщение удалено", requiredMode = REQUIRED) boolean deleted) {
}
