package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;

import com.hackathon.app.domain.enums.PersonalReminderStatus;
import com.hackathon.app.domain.enums.TravelMode;
import io.swagger.v3.oas.annotations.media.Schema;

/** Что пользователь уже решил по подсказке на это занятие. */
@Schema(description = "Личное напоминание на занятие")
public record LeaveReminderResponse(
		@Schema(requiredMode = REQUIRED) PersonalReminderStatus status,
		@Schema(description = "Когда напомнить; у отказа нет") Instant dueAt,
		@Schema(description = "Минут в пути по выбранному способу") Integer travelMinutes,
		@Schema(description = "Выбранный способ") TravelMode travelMode) {
}
