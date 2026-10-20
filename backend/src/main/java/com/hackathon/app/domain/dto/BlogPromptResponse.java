package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "«Как прошла встреча? Напиши пост»: последняя закончившаяся встреча, о которой я ещё не писал")
public record BlogPromptResponse(
		@Schema(requiredMode = REQUIRED) BlogEventResponse event,
		@Schema(description = "Когда закончилась", requiredMode = REQUIRED) Instant endedAt,
		@Schema(description = "Первые фото альбома и мероприятия — их можно взять в пост", requiredMode = REQUIRED)
		List<FileResponse> photos,
		@Schema(description = "Сколько всего фото со встречи", requiredMode = REQUIRED) long photosCount) {
}
