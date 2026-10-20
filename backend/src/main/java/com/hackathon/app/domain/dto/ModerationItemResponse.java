package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.domain.enums.ModerationCategory;
import com.hackathon.app.domain.enums.ModerationDecision;
import com.hackathon.app.domain.enums.ModerationSource;
import com.hackathon.app.domain.enums.ModerationStatus;
import com.hackathon.app.domain.enums.ModerationTarget;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Проверка текста в очереди модерации")
public record ModerationItemResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Что проверяли", requiredMode = REQUIRED) ModerationTarget targetType,
		@Schema(description = "Id объекта: сообщения, мероприятия, пользователя или организации", requiredMode = REQUIRED)
		UUID targetId,
		@Schema(description = "Мероприятие (у сообщения — его обсуждение); null — профиль или анкета") UUID eventId,
		@Schema(description = "Название мероприятия, организации или имя человека — подпись ссылки") String targetTitle,
		@Schema(description = "Автор текста; null — аккаунт удалён") UserShortResponse author,
		@Schema(description = "Проверенный текст; у мероприятия и анкеты — поля с подписями", requiredMode = REQUIRED)
		String text,
		@Schema(requiredMode = REQUIRED) ModerationStatus status,
		@Schema(description = "Кто оценил: словарь или нейросеть; null — ещё никто") ModerationSource source,
		@Schema(description = "Найденные нарушения", requiredMode = REQUIRED) Set<ModerationCategory> categories,
		@Schema(description = "0 — нет нарушений, 3 — грубое", requiredMode = REQUIRED) int severity,
		@Schema(description = "Пояснение оценки") String explanation,
		@Schema(description = "Сообщение сейчас скрыто (только для сообщений)", requiredMode = REQUIRED) boolean hidden,
		@Schema(description = "Когда текст отправлен на проверку или изменён", requiredMode = REQUIRED) Instant updatedAt,
		@Schema(description = "Когда поставлена оценка") Instant checkedAt,
		@Schema(description = "Решение администратора") ModerationDecision decision,
		@Schema(description = "Когда принято решение") Instant reviewedAt) {
}
