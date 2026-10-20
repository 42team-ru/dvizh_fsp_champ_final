package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Цитата над ответом: на какой комментарий ответили")
public record BlogCommentReplyResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "Начало текста; null — удалено") String text,
		@Schema(requiredMode = REQUIRED) boolean deleted) {
}
