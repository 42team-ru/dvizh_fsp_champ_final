package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Комментарий в обсуждении мероприятия")
public record CommentResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Автор", requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "Текст", requiredMode = REQUIRED) String text,
		// имя в JSON фиксируем явно, как в ViewerResponse: у boolean с префиксом is Jackson и springdoc могут вывести «organizer»
		@JsonProperty("isOrganizer")
		@Schema(description = "Автор — организатор мероприятия: показать метку «Организатор»", requiredMode = REQUIRED)
		boolean isOrganizer,
		@Schema(requiredMode = REQUIRED) Instant createdAt) {
}
