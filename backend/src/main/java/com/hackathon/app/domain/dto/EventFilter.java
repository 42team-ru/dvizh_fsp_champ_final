package com.hackathon.app.domain.dto;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.JoinMode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.format.annotation.DateTimeFormat;

/** Фильтры ленты (все необязательные). */
@Schema(description = "Фильтры ленты, все необязательные")
public record EventFilter(
		@Schema(description = "Поиск без учёта регистра по названию, описанию, адресу, виду спорта и организации", example = "футбол")
		String searchText,
		@Schema(description = "Вид спорта")
		UUID sportId,
		@Schema(description = "Начало не раньше; по умолчанию — сейчас (прошедшие не показываем)", example = "2027-05-01T00:00:00Z")
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
		@Schema(description = "Начало не позже", example = "2027-05-31T23:59:59Z")
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
		@Schema(description = "Уровень; мероприятия «Любой уровень» подходят под любой")
		EventLevel level,
		@Schema(description = "Режим записи")
		JoinMode joinMode,
		@Schema(description = "Очно или онлайн")
		EventFormat format,
		@Schema(description = "Только мероприятия этой организации — для её публичной страницы")
		UUID organizationId,
		@Schema(description = "«Для меня»: только виды спорта из моего профиля и подходящие моему уровню в них "
				+ "(уровень мероприятия «Любой» или как у меня; уровень не указан — любой)")
		Boolean forMe,
		@Schema(description = "Рядом с точкой: широта (вместе с lon); онлайн-мероприятия показываются всегда", example = "56.0153")
		@DecimalMin("-90") @DecimalMax("90") Double lat,
		@Schema(description = "Рядом с точкой: долгота (вместе с lat)", example = "92.8932")
		@DecimalMin("-180") @DecimalMax("180") Double lon,
		@Schema(description = "Радиус «рядом» в км, 1–100; по умолчанию 10", example = "10")
		@Min(1) @Max(100) Integer radiusKm,
		@Schema(description = "Страница с нуля; по умолчанию 0", example = "0")
		@Min(0) Integer page,
		@Schema(description = "Размер страницы 1–100; по умолчанию 100. Пришло меньше size — дальше пусто", example = "20")
		@Min(1) @Max(100) Integer size) {
}
