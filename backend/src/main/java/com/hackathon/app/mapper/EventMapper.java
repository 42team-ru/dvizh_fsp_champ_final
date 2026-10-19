package com.hackathon.app.mapper;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.dto.CreateEventRequest;
import com.hackathon.app.dto.EventRegistrationResponse;
import com.hackathon.app.dto.EventResponse;
import com.hackathon.app.dto.ParticipantResponse;
import com.hackathon.app.dto.RegistrationResponse;
import com.hackathon.app.dto.SportResponse;
import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Event;
import com.hackathon.app.entity.Registration;
import com.hackathon.app.entity.Sport;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = MappingConfig.class)
public interface EventMapper {

	/** Новое мероприятие сразу опубликовано; level и joinMode по умолчанию ANY и FREE. */
	@Mapping(target = "level", defaultValue = "ANY")
	@Mapping(target = "joinMode", defaultValue = "FREE")
	@Mapping(target = "status", constant = "PUBLISHED")
	Event toEntity(CreateEventRequest request, UUID authorId);

	/** Статус и время решения выбирает сервис. */
	Registration toRegistration(UUID eventId, UUID userId, Registration.Status status, String message,
			Instant decidedAt);

	/** Повторная запись после отмены: та же строка (unique по мероприятию и пользователю), новые статус и сообщение. */
	Registration rejoin(@MappingTarget Registration registration, Registration.Status status, String message,
			Instant decidedAt);

	/** Пользователь сам отменил запись; decidedAt — момент отмены. */
	@Mapping(target = "status", constant = "CANCELLED")
	Registration cancel(@MappingTarget Registration registration, Instant decidedAt);

	/** Решение организатора (в том числе пересмотр прежнего). */
	Registration decide(@MappingTarget Registration registration, Registration.Status status, Instant decidedAt);

	@Mapping(target = "id", source = "registration.id")
	@Mapping(target = "participant", source = "user")
	@Mapping(target = "createdAt", source = "registration.createdAt")
	EventRegistrationResponse toEventRegistration(Registration registration, AppUser user);

	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "sport", source = "sport")
	@Mapping(target = "createdAt", source = "event.createdAt")
	@Mapping(target = "updatedAt", source = "event.updatedAt")
	EventResponse toResponse(Event event, Sport sport, long participantsCount,
			Registration.Status myRegistrationStatus);

	SportResponse toResponse(Sport sport);

	RegistrationResponse toResponse(Registration registration);

	ParticipantResponse toParticipant(AppUser user);
}
