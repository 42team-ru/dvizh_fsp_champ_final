package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.JoinMode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;

/**
 * Запрос точек для карты: видимая область (WGS 84) и фильтры ленты.
 * Если minLon больше maxLon, область пересекает 180-й меридиан.
 */
@Schema(description = "Видимая область карты и фильтры; область обязательна, остальное нет")
public record EventMapFilter(
		@Schema(description = "Западная граница (долгота юго-западного угла)", example = "92.7", requiredMode = REQUIRED)
		@NotNull @DecimalMin("-180") @DecimalMax("180") Double minLon,
		@Schema(description = "Южная граница (широта юго-западного угла)", example = "55.9", requiredMode = REQUIRED)
		@NotNull @DecimalMin("-90") @DecimalMax("90") Double minLat,
		@Schema(description = "Восточная граница (долгота северо-восточного угла)", example = "93.1", requiredMode = REQUIRED)
		@NotNull @DecimalMin("-180") @DecimalMax("180") Double maxLon,
		@Schema(description = "Северная граница (широта северо-восточного угла)", example = "56.1", requiredMode = REQUIRED)
		@NotNull @DecimalMin("-90") @DecimalMax("90") Double maxLat,
		@Schema(description = "Начало не раньше; по умолчанию и не раньше чем сейчас", example = "2027-05-01T00:00:00Z")
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
		@Schema(description = "Начало не позже; по умолчанию from + 30 дней", example = "2027-05-31T23:59:59Z")
		@DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
		@Schema(description = "Поиск по названию и описанию без учёта регистра", example = "футбол")
		String searchText,
		@Schema(description = "Вид спорта")
		UUID sportId,
		@Schema(description = "Уровень; мероприятия «Любой уровень» подходят под любой")
		EventLevel level,
		@Schema(description = "Режим записи")
		JoinMode joinMode,
		@Schema(description = "«Для меня»: только виды спорта из моего профиля и подходящие моему уровню, как в ленте")
		Boolean forMe,
		@Schema(description = "Только мероприятия этой организации (карта на странице организации)")
		UUID organizationId,
		@Schema(description = "Центр фильтра по городу: широта, вместе с lon")
		@DecimalMin("-90") @DecimalMax("90") Double lat,
		@Schema(description = "Центр фильтра по городу: долгота, вместе с lat")
		@DecimalMin("-180") @DecimalMax("180") Double lon,
		@Schema(description = "Радиус вокруг центра в км, 1–100; по умолчанию 10")
		@Min(1) @Max(100) Integer radiusKm) {
}
