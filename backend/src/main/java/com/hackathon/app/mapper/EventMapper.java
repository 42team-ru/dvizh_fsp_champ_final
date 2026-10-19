package com.hackathon.app.mapper;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.dto.EventRequest;
import com.hackathon.app.dto.EventResponse;
import com.hackathon.app.dto.EventSummaryResponse;
import com.hackathon.app.dto.OrganizerResponse;
import com.hackathon.app.dto.ViewerResponse;
import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Event;
import com.hackathon.app.entity.Registration;
import com.hackathon.app.entity.Sport;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValueMappingStrategy;

@Mapper(config = MappingConfig.class, uses = { SportMapper.class, UserMapper.class })
public interface EventMapper {

	/** Новое мероприятие сразу опубликовано; level и joinMode по умолчанию ANY и FREE; вид спорта уже найден или создан. */
	@Mapping(target = "sportId", source = "resolvedSportId")
	@Mapping(target = "level", defaultValue = "ANY")
	@Mapping(target = "joinMode", defaultValue = "FREE")
	@Mapping(target = "status", constant = "PUBLISHED")
	Event toEntity(EventRequest request, UUID authorId, UUID resolvedSportId);

	/** PUT: все поля формы заменяются; автор, статус и модерация не меняются. */
	@Mapping(target = "sportId", source = "resolvedSportId")
	@Mapping(target = "level", defaultValue = "ANY")
	@Mapping(target = "joinMode", defaultValue = "FREE")
	void update(@MappingTarget Event event, EventRequest request, UUID resolvedSportId);

	/** onlineUrl и privateDetails передаёт сервис: null, если пользователю их видеть нельзя. */
	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "status", source = "event.status")
	@Mapping(target = "onlineUrl", source = "onlineUrl")
	@Mapping(target = "privateDetails", source = "privateDetails")
	@Mapping(target = "createdAt", source = "event.createdAt")
	@Mapping(target = "updatedAt", source = "event.updatedAt")
	EventResponse toResponse(Event event, Sport sport, AppUser author, List<OrganizerResponse> organizers,
			List<AppUser> participants, long participantsCount, ViewerResponse viewer, String onlineUrl,
			String privateDetails);

	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "status", source = "event.status")
	EventSummaryResponse toSummary(Event event, Sport sport, long participantsCount,
			Registration.Status myRegistrationStatus);

	/** Решения считает EventAccessPolicy; canRegister — когда нет причины отказа. Блок есть всегда, даже если все поля null. */
	@BeanMapping(nullValueMappingStrategy = NullValueMappingStrategy.RETURN_DEFAULT)
	@Mapping(target = "canRegister", expression = "java(registerBlockedReason == null)")
	ViewerResponse toViewer(Registration.Status registrationStatus, String registerBlockedReason, boolean isOrganizer,
			boolean canManage, boolean canManageOrganizers, boolean canCancel, boolean canSeePrivateDetails);
}
