package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;

/** GeoJSON Point. Порядок координат как в GeoJSON и 2ГИС: сначала долгота, потом широта. */
@Schema(description = "GeoJSON Point")
public record PointGeometry(
		@Schema(allowableValues = "Point", requiredMode = REQUIRED) String type,
		@ArraySchema(minItems = 2, maxItems = 2, arraySchema = @Schema(
				description = "[долгота, широта] — именно в таком порядке", example = "[92.9301, 56.0275]",
				requiredMode = REQUIRED))
		List<Double> coordinates) {

	public static PointGeometry of(double lon, double lat) {
		return new PointGeometry("Point", List.of(lon, lat));
	}
}
