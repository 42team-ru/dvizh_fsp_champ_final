package com.hackathon.app.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.Event;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.format.annotation.DateTimeFormat;

/** Фильтры ленты (все необязательные). */
@Schema(description = "Фильтры ленты, все необязательные")
public record EventFilter(
		@Schema(description = "Поиск по названию и описанию без учёта регистра", example = "футбол")
		String q,
		@Schema(description = "Вид спорта")
		UUID sportId,
		@Schema(description = "Начало не раньше; по умолчанию — сейчас (прошедшие не показываем)", example = "2027-05-01T00:00:00Z")
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
		@Schema(description = "Начало не позже", example = "2027-05-31T23:59:59Z")
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
		@Schema(description = "Уровень; мероприятия «Любой уровень» подходят под любой")
		Event.Level level,
		@Schema(description = "Режим записи")
		Event.JoinMode joinMode,
		@Schema(description = "Очно или онлайн")
		Event.Format format) {
}
