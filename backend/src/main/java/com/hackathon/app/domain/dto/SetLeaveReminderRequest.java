package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import com.hackathon.app.domain.enums.TravelMode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** «Напомнить»: когда и как добираюсь (время в пути может прийти от маршрута 2ГИС в браузере). */
@Schema(description = "Поставить личное напоминание на занятие")
public record SetLeaveReminderRequest(
		@Schema(description = "Когда напомнить: до начала занятия, не раньше чем за 12 часов", requiredMode = REQUIRED)
		@NotNull Instant dueAt,
		@Schema(description = "Минут в пути по выбранному способу", example = "25")
		@Min(0) @Max(600) Integer travelMinutes,
		@Schema(description = "Способ; NONE — просто напомнить до начала", requiredMode = REQUIRED)
		@NotNull TravelMode travelMode) {
}
