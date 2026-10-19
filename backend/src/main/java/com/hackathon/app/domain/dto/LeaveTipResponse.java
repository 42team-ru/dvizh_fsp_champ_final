package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.TravelMode;
import io.swagger.v3.oas.annotations.media.Schema;

/** «Бублик подсказывает»: ближайшее занятие, когда выходить и что уже решено. */
@Schema(description = "Подсказка «когда выходить» на ближайшее подтверждённое занятие")
public record LeaveTipResponse(
		@Schema(requiredMode = REQUIRED) UUID eventId,
		@Schema(requiredMode = REQUIRED) UUID occurrenceId,
		@Schema(requiredMode = REQUIRED) String title,
		@Schema(description = "Начало занятия", requiredMode = REQUIRED) Instant startAt,
		@Schema(requiredMode = REQUIRED) EventFormat format,
		@Schema(description = "Адрес или пояснение к месту; у онлайн нет") String place,
		@Schema(description = "Широта места; у онлайн нет") Double lat,
		@Schema(description = "Долгота места; у онлайн нет") Double lon,
		@Schema(description = "Домашняя точка из предпочтений; нет — время в пути не считаем") HomePoint home,
		@Schema(description = "Прямое расстояние от дома до места, км") Double distanceKm,
		@Schema(description = "Оценки дороги: пешком, на автобусе, на машине; пусто без дома или онлайн", requiredMode = REQUIRED)
		List<TravelOptionResponse> estimates,
		@Schema(description = "Что предложить по умолчанию; NONE — без дороги", requiredMode = REQUIRED) TravelMode recommendedMode,
		@Schema(description = "Когда напомнить по умолчанию: выход по оценке, без дома — за час, онлайн — за 15 минут", requiredMode = REQUIRED)
		Instant suggestedRemindAt,
		@Schema(description = "Уже поставленное напоминание или отказ") LeaveReminderResponse reminder) {
}
