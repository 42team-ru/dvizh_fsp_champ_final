package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Время занятия: разовая дата серии или перенос. */
@Schema(description = "Время занятия: для добавления разовой даты или переноса")
public record OccurrenceRequest(
		@Schema(description = "Начало, в будущем и в границах серии", example = "2027-06-12T13:00:00Z", requiredMode = REQUIRED)
		@NotNull Instant startAt,
		@Schema(description = "Окончание, позже начала. При переносе можно не указывать — длительность сохранится; "
				+ "у разовой даты обязательно", example = "2027-06-12T14:30:00Z")
		Instant endAt) {
}
