package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Правило расписания серии")
public record ScheduleRuleResponse(
		@Schema(description = "Первое занятие по правилу, местное время серии", requiredMode = REQUIRED)
		LocalDateTime firstStart,
		@Schema(description = "Длительность занятия, минуты", requiredMode = REQUIRED) int durationMinutes,
		@Schema(description = "Правило повторения RFC 5545", example = "FREQ=WEEKLY;BYDAY=TU", requiredMode = REQUIRED)
		String rrule,
		@Schema(description = "Правило словами", example = "по вторникам в 20:00", requiredMode = REQUIRED)
		String description) {
}
