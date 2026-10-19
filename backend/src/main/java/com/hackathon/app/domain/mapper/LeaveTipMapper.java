package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.HomePoint;
import com.hackathon.app.domain.dto.LeaveReminderResponse;
import com.hackathon.app.domain.dto.LeaveTipResponse;
import com.hackathon.app.domain.dto.TravelOptionResponse;
import com.hackathon.app.domain.entity.PersonalReminder;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.PersonalReminderStatus;
import com.hackathon.app.domain.enums.TravelMode;
import com.hackathon.app.domain.enums.TravelSource;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

/** Подсказка «когда выходить» и личные напоминания: создание, смена состояния и ответы. */
@Mapper(config = MappingConfig.class)
public interface LeaveTipMapper {

	PersonalReminder reminder(UUID userId, UUID eventId, UUID occurrenceId, Instant expectedStartAt, Instant dueAt,
			PersonalReminderStatus status, Integer travelMinutes, TravelMode travelMode);

	/** Новое решение по той же паре (пользователь, занятие): поля заменяются целиком, null очищает. */
	void decide(@MappingTarget PersonalReminder reminder, Instant expectedStartAt, Instant dueAt,
			PersonalReminderStatus status, Integer travelMinutes, TravelMode travelMode);

	void status(@MappingTarget PersonalReminder reminder, PersonalReminderStatus status);

	LeaveReminderResponse toResponse(PersonalReminder reminder);

	TravelOptionResponse option(TravelMode mode, int minutes, boolean available, String note, TravelSource source);

	/** Вручную: MapStruct разложил бы {@code home.lat/lon} в координаты места. */
	default LeaveTipResponse tip(UUID eventId, UUID occurrenceId, String title, Instant startAt, EventFormat format, String place,
			Double lat, Double lon, HomePoint home, Double distanceKm, List<TravelOptionResponse> estimates,
			TravelMode recommendedMode, Instant suggestedRemindAt, LeaveReminderResponse reminder) {
		return new LeaveTipResponse(eventId, occurrenceId, title, startAt, format, place, lat, lon, home, distanceKm,
				estimates, recommendedMode, suggestedRemindAt, reminder);
	}
}
