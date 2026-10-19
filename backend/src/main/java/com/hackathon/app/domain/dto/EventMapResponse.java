package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * GeoJSON FeatureCollection — её как есть принимают 2ГИС MapGL, Leaflet и MapLibre.
 * truncated и limit — допустимые в GeoJSON дополнительные поля.
 */
@Schema(description = "GeoJSON FeatureCollection с мероприятиями в видимой области")
public record EventMapResponse(
		@Schema(allowableValues = "FeatureCollection", requiredMode = REQUIRED) String type,
		@Schema(description = "Ближайшие по времени начала, не больше limit", requiredMode = REQUIRED)
		List<EventMapFeature> features,
		@Schema(description = "В области больше limit мероприятий: показаны не все, стоит приблизить карту",
				requiredMode = REQUIRED) boolean truncated,
		@Schema(description = "Сколько точек отдаётся максимум", example = "1000", requiredMode = REQUIRED) int limit) {
}
