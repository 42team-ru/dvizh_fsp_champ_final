package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Сообщение в обсуждении мероприятия")
public record CommentResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Кто написал", requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "Организация, от имени которой написано (автор — её аккаунт); null — человек. "
				+ "Показывать её название вместо имени контактного лица")
		OrganizationShortResponse organization,
		@Schema(description = "Текст; null — сообщение удалено автором или скрыто модератором") String text,
		// имя в JSON фиксируем явно, как в ViewerResponse: у boolean с префиксом is Jackson и springdoc могут вывести «organizer»
		@JsonProperty("isOrganizer")
		@Schema(description = "Автор — организатор мероприятия: показать метку «Организатор»", requiredMode = REQUIRED)
		boolean isOrganizer,
		@JsonProperty("isMine")
		@Schema(description = "Моё сообщение: показать справа, как в мессенджере", requiredMode = REQUIRED)
		boolean isMine,
		@Schema(description = "Могу исправить или удалить: моё, не удалено, обсуждение открыто", requiredMode = REQUIRED)
		boolean canEdit,
		@Schema(description = "Ответ на это сообщение (цитата над текстом); null — сообщение в общий поток")
		CommentReplyResponse replyTo,
		@Schema(description = "Сколько ответов на это сообщение", requiredMode = REQUIRED) long repliesCount,
		@Schema(description = "Когда отправлено", requiredMode = REQUIRED) Instant createdAt,
		@Schema(description = "Когда изменено; null — не менялось (показать «изменено»)") Instant editedAt,
		@Schema(description = "Удалено автором", requiredMode = REQUIRED) boolean deleted,
		@Schema(description = "Скрыто администратором: показать «Сообщение скрыто модератором»", requiredMode = REQUIRED)
		boolean hidden,
		@Schema(description = "Причина скрытия — только администратору и автору; иначе null") String hiddenReason,
		@Schema(description = "Оценка модерации — только администратору; null — не проверялось или не админ")
		CommentModerationResponse moderation) {
}
