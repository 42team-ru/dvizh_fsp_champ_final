package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Комментарий под постом")
public record BlogCommentResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "Организация, если пишет её аккаунт") OrganizationShortResponse organization,
		@Schema(description = "Автор поста — метка «Автор»", requiredMode = REQUIRED) boolean isPostAuthor,
		@Schema(description = "Текст; null — удалено") String text,
		@Schema(requiredMode = REQUIRED) Instant createdAt,
		@Schema(description = "Когда исправлено; null — не менялось") Instant editedAt,
		@Schema(requiredMode = REQUIRED) boolean deleted,
		@Schema(description = "Цитата комментария, на который это ответ") BlogCommentReplyResponse replyTo,
		@Schema(description = "Мой комментарий", requiredMode = REQUIRED) boolean isMine,
		@Schema(description = "Могу исправить или удалить", requiredMode = REQUIRED) boolean canEdit) {
}
