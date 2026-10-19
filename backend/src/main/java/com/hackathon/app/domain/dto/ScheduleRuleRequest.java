package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Одно правило расписания серии: с какого занятия начинается, сколько длится и как повторяется. */
@Schema(description = "Правило расписания: первое занятие, длительность и RRULE")
public record ScheduleRuleRequest(
		@Schema(description = "Первое занятие по правилу: местные дата и время в часовом поясе серии, без смещения. "
				+ "Должно попадать в границы серии; от него считается «раз в N недель»",
				example = "2027-06-01T20:00:00", requiredMode = REQUIRED)
		@NotNull LocalDateTime firstStart,
		@Schema(description = "Длительность каждого занятия, минуты", example = "90", minimum = "1", maximum = "1440",
				requiredMode = REQUIRED)
		@NotNull @Min(1) @Max(1440) Integer durationMinutes,
		@Schema(description = "Правило повторения по RFC 5545 (префикс RRULE: можно не писать). Не чаще раза в день; "
				+ "COUNT и UNTIL можно, но занятия всё равно режутся границами серии",
				example = "FREQ=WEEKLY;INTERVAL=2;BYDAY=SU", requiredMode = REQUIRED)
		@NotBlank @Size(max = 500) String rrule) {
}
