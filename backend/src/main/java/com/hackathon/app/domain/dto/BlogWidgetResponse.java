package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Виджет «Наши тренировки» в конце поста: ближайшие встречи клуба или организатора")
public record BlogWidgetResponse(
		@Schema(description = "Клуб; null — виджет организатора-человека") OrganizationShortResponse organization,
		@Schema(description = "Организатор-человек; null — виджет клуба") UserShortResponse organizer,
		@Schema(description = "До трёх ближайших встреч; пусто — скоро новые", requiredMode = REQUIRED)
		List<EventSummaryResponse> events) {
}
