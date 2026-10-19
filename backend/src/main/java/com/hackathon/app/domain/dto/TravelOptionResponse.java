package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.TravelMode;
import com.hackathon.app.domain.enums.TravelSource;
import io.swagger.v3.oas.annotations.media.Schema;

/** Способ добраться: сколько минут, можно ли им воспользоваться и откуда цифра. */
@Schema(description = "Дорога одним способом")
public record TravelOptionResponse(
		@Schema(requiredMode = REQUIRED) TravelMode mode,
		@Schema(description = "Минут в пути", requiredMode = REQUIRED) int minutes,
		@Schema(description = "false — транспорт в это время не ходит", requiredMode = REQUIRED) boolean available,
		@Schema(description = "Пояснение: номера маршрутов или «первый рейс в 05:57»", example = "№ 12, 15") String note,
		@Schema(requiredMode = REQUIRED) TravelSource source) {
}
