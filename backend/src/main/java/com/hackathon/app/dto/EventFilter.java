package com.hackathon.app.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.Event;
import org.springframework.format.annotation.DateTimeFormat;

/**
 * Фильтры ленты (все необязательные): q — поиск по названию и описанию, from/to — время начала (по умолчанию from = сейчас),
 * level — уровень (события «Любой уровень» подходят под любой).
 */
public record EventFilter(
		String q,
		UUID sportId,
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
		Event.Level level,
		Event.JoinMode joinMode,
		Event.Format format) {
}
