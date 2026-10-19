package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.dto.EventRegistrationResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.MyRegistrationResponse;
import com.hackathon.app.domain.dto.RegistrationResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.RegistrationStatus;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = MappingConfig.class, uses = UserMapper.class)
public interface RegistrationMapper {

	/** Статус и время решения выбирает сервис. */
	Registration toRegistration(UUID eventId, UUID userId, RegistrationStatus status, String message,
			Instant decidedAt);

	/** Повторная запись после отмены: та же строка (unique по мероприятию и пользователю), прежнее решение стирается. */
	@Mapping(target = "decisionReason", expression = "java(null)")
	@Mapping(target = "decidedById", expression = "java(null)")
	Registration rejoin(@MappingTarget Registration registration, RegistrationStatus status, String message,
			Instant decidedAt);

	/** Пользователь сам отменил запись; decidedAt — момент отмены. */
	@Mapping(target = "status", constant = "CANCELLED")
	Registration cancel(@MappingTarget Registration registration, Instant decidedAt, UUID decidedById);

	/** Решение организатора (в том числе пересмотр прежнего). */
	Registration decide(@MappingTarget Registration registration, RegistrationStatus status, String decisionReason,
			Instant decidedAt, UUID decidedById);

	RegistrationResponse toResponse(Registration registration);

	@Mapping(target = "id", source = "registration.id")
	@Mapping(target = "participant", source = "user")
	@Mapping(target = "createdAt", source = "registration.createdAt")
	EventRegistrationResponse toEventRegistration(Registration registration, AppUser user);

	@Mapping(target = "id", source = "registration.id")
	@Mapping(target = "status", source = "registration.status")
	MyRegistrationResponse toMine(Registration registration, EventSummaryResponse event);
}
