package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

/** GeoJSON Feature: одно мероприятие на карте. */
@Schema(description = "GeoJSON Feature: мероприятие на карте")
public record EventMapFeature(
		@Schema(allowableValues = "Feature", requiredMode = REQUIRED) String type,
		@Schema(description = "id мероприятия", requiredMode = REQUIRED) UUID id,
		@Schema(requiredMode = REQUIRED) PointGeometry geometry,
		@Schema(requiredMode = REQUIRED) EventMapProperties properties) {
}
