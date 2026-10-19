package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AdminEventResponse;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.dto.EventResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.domain.dto.ViewerResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValueMappingStrategy;

@Mapper(config = MappingConfig.class, uses = { SportMapper.class, UserMapper.class, OrganizationMapper.class })
public interface EventMapper {

	/**
	 * Новое мероприятие сразу опубликовано; level и joinMode по умолчанию ANY и FREE; вид спорта уже найден или создан.
	 * organizationId — организация аккаунта-автора (null — от частного лица).
	 */
	@Mapping(target = "sportId", source = "resolvedSportId")
	@Mapping(target = "level", defaultValue = "ANY")
	@Mapping(target = "joinMode", defaultValue = "FREE")
	@Mapping(target = "status", constant = "PUBLISHED")
	Event toEntity(EventRequest request, UUID authorId, UUID resolvedSportId, UUID organizationId);

	/** PUT: все поля формы заменяются; автор, статус и модерация не меняются. */
	@Mapping(target = "sportId", source = "resolvedSportId")
	@Mapping(target = "level", defaultValue = "ANY")
	@Mapping(target = "joinMode", defaultValue = "FREE")
	void update(@MappingTarget Event event, EventRequest request, UUID resolvedSportId);

	/** Админ снял с публикации или удалил: статус, причина, когда и кто. */
	void moderate(@MappingTarget Event event, EventStatus status, String moderationReason, Instant moderatedAt,
			UUID moderatedById);

	/**
	 * onlineUrl и privateDetails передаёт сервис: null, если пользователю их видеть нельзя.
	 * organization — null, если мероприятие от частного лица.
	 */
	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "description", source = "event.description")
	@Mapping(target = "status", source = "event.status")
	@Mapping(target = "organization", source = "organization")
	@Mapping(target = "onlineUrl", source = "onlineUrl")
	@Mapping(target = "privateDetails", source = "privateDetails")
	@Mapping(target = "createdAt", source = "event.createdAt")
	@Mapping(target = "updatedAt", source = "event.updatedAt")
	EventResponse toResponse(Event event, Sport sport, AppUser author, Organization organization,
			List<OrganizerResponse> organizers, List<AppUser> participants, long participantsCount,
			ViewerResponse viewer, String onlineUrl, String privateDetails);

	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "status", source = "event.status")
	EventSummaryResponse toSummary(Event event, Sport sport, long participantsCount,
			RegistrationStatus myRegistrationStatus);

	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "createdAt", source = "event.createdAt")
	AdminEventResponse toAdmin(Event event, Sport sport, AppUser author, long participantsCount);

	/** Решения считает EventAccessPolicy; canRegister — когда нет причины отказа. Блок есть всегда, даже если все поля null. */
	@BeanMapping(nullValueMappingStrategy = NullValueMappingStrategy.RETURN_DEFAULT)
	@Mapping(target = "canRegister", expression = "java(registerBlockedReason == null)")
	ViewerResponse toViewer(RegistrationStatus registrationStatus, String registerBlockedReason, boolean isOrganizer,
			boolean canManage, boolean canManageOrganizers, boolean canCancel, boolean canSeePrivateDetails,
			boolean canComment);
}
