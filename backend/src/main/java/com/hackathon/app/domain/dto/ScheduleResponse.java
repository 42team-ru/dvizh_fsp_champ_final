package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Расписание серии")
public record ScheduleResponse(
		@Schema(description = "Часовой пояс (IANA)", example = "Asia/Krasnoyarsk", requiredMode = REQUIRED) String timeZone,
		@Schema(description = "Первый день серии", requiredMode = REQUIRED) LocalDate startDate,
		@Schema(description = "Последний день серии", requiredMode = REQUIRED) LocalDate endDate,
		@Schema(description = "Правила по порядку", requiredMode = REQUIRED) List<ScheduleRuleResponse> rules,
		@Schema(description = "Всё расписание словами",
				example = "по вторникам в 20:00; по воскресеньям раз в 2 недели в 14:00", requiredMode = REQUIRED)
		String description) {
}
