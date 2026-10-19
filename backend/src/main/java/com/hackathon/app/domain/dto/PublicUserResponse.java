package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** Публичный профиль организатора-человека: без email и прочих личных данных, с его ближайшими мероприятиями. */
@Schema(description = "Публичный профиль организатора-человека и его ближайшие мероприятия")
public record PublicUserResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Логин", example = "ivan", requiredMode = REQUIRED) String username,
		@Schema(description = "Имя", example = "Иван", requiredMode = REQUIRED) String firstName,
		@Schema(description = "Фамилия", example = "Петров", requiredMode = REQUIRED) String lastName,
		@Schema(description = "Ссылка на аватар") String avatarUrl,
		@Schema(description = "Город", example = "Красноярск") String city,
		@Schema(description = "О себе", example = "Играю в футбол по выходным") String bio,
		@Schema(description = "Виды спорта и уровень в каждом", requiredMode = REQUIRED) List<UserSportResponse> sports,
		@Schema(description = "Сколько встреч посетил", example = "14", requiredMode = REQUIRED) long attendedCount,
		@Schema(description = "Доверие к организатору: сколько встреч уже провёл", example = "6", requiredMode = REQUIRED)
		long hostedMeetings,
		@Schema(description = "Доверие к организатору: сколько разных людей записывались на его прошедшие встречи",
				example = "23", requiredMode = REQUIRED) long participantsTotal,
		@Schema(description = "Опубликованные и ещё не начавшиеся мероприятия, где человек автор; ближайшие первыми",
				requiredMode = REQUIRED) List<EventSummaryResponse> events,
        @Schema(description = "Фото личной галереи в порядке загрузки, до 6; отдельно от аватара", requiredMode = REQUIRED)
        List<FileResponse> photos) {
}
