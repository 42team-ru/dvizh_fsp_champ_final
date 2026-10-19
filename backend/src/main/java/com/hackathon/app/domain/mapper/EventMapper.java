package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AdminEventResponse;
import com.hackathon.app.domain.dto.EventMapFeature;
import com.hackathon.app.domain.dto.EventMapProperties;
import com.hackathon.app.domain.dto.EventMapResponse;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.dto.EventResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.OccurrenceResponse;
import com.hackathon.app.domain.dto.OccurrenceShortResponse;
import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.domain.dto.PointGeometry;
import com.hackathon.app.domain.dto.ScheduleResponse;
import com.hackathon.app.domain.dto.ScheduleRuleResponse;
import com.hackathon.app.domain.dto.ViewerResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.QuorumStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValueMappingStrategy;

@Mapper(config = MappingConfig.class, uses = { SportMapper.class, UserMapper.class, OrganizationMapper.class },
		imports = { EventFormat.class, PointGeometry.class })
public interface EventMapper {

	/**
	 * Новое мероприятие сразу опубликовано; level и joinMode по умолчанию ANY и FREE; вид спорта уже найден или создан.
	 * organizationId — организация аккаунта-автора (null — от частного лица).
	 * У онлайн-мероприятия точки на карте нет: координаты не сохраняются.
	 * spanStart/spanEnd — время разового или первого занятия серии (у серии его считает OccurrenceService).
	 */
	@Mapping(target = "sportId", source = "resolvedSportId")
	@Mapping(target = "startAt", source = "spanStart")
	@Mapping(target = "endAt", source = "spanEnd")
	@Mapping(target = "recurring", expression = "java(request.schedule() != null)")
	@Mapping(target = "timeZone", source = "request.schedule.timeZone")
	@Mapping(target = "seriesStartDate", source = "request.schedule.startDate")
	@Mapping(target = "seriesEndDate", source = "request.schedule.endDate")
	@Mapping(target = "lat", expression = "java(request.format() == EventFormat.ONLINE ? null : request.lat())")
	@Mapping(target = "lon", expression = "java(request.format() == EventFormat.ONLINE ? null : request.lon())")
	@Mapping(target = "level", defaultValue = "ANY")
	@Mapping(target = "joinMode", defaultValue = "FREE")
	@Mapping(target = "status", constant = "PUBLISHED")
	Event toEntity(EventRequest request, UUID authorId, UUID resolvedSportId, UUID organizationId, Instant spanStart,
			Instant spanEnd);

	/**
	 * PUT: все поля формы заменяются; автор, статус, модерация и разовое/серия не меняются. У онлайн-мероприятия координат нет.
	 */
	@Mapping(target = "sportId", source = "resolvedSportId")
	@Mapping(target = "startAt", source = "spanStart")
	@Mapping(target = "endAt", source = "spanEnd")
	@Mapping(target = "timeZone", source = "request.schedule.timeZone")
	@Mapping(target = "seriesStartDate", source = "request.schedule.startDate")
	@Mapping(target = "seriesEndDate", source = "request.schedule.endDate")
	@Mapping(target = "lat", expression = "java(request.format() == EventFormat.ONLINE ? null : request.lat())")
	@Mapping(target = "lon", expression = "java(request.format() == EventFormat.ONLINE ? null : request.lon())")
	@Mapping(target = "level", defaultValue = "ANY")
	@Mapping(target = "joinMode", defaultValue = "FREE")
	void update(@MappingTarget Event event, EventRequest request, UUID resolvedSportId, Instant spanStart,
			Instant spanEnd);

	/** startAt/endAt серии — по её первому занятию. */
	void span(@MappingTarget Event event, Instant startAt, Instant endAt);

	@Mapping(target = "timeZone", source = "event.timeZone")
	@Mapping(target = "startDate", source = "event.seriesStartDate")
	@Mapping(target = "endDate", source = "event.seriesEndDate")
	@Mapping(target = "rules", source = "rules")
	@Mapping(target = "description", source = "description")
	ScheduleResponse toSchedule(Event event, List<ScheduleRuleResponse> rules, String description);

	/** Объявление организатора: текст и время; null, null — снять. */
	default void announce(@MappingTarget Event event, String announcement, Instant announcedAt) {
		// вручную: сгенерированный метод пропустил бы null и не снял бы объявление
		event.setAnnouncement(announcement);
		event.setAnnouncedAt(announcedAt);
	}

	/** Админ снял с публикации, удалил или вернул в публикацию: статус, причина, когда и кто. */
	void moderate(@MappingTarget Event event, EventStatus status, String moderationReason, Instant moderatedAt,
			UUID moderatedById);

	/**
	 * onlineUrl и privateDetails передаёт сервис: null, если пользователю их видеть нельзя.
	 * organization — null, если мероприятие от частного лица. schedule — null у разового.
	 */
	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "startAt", source = "event.startAt")
	@Mapping(target = "endAt", source = "event.endAt")
	@Mapping(target = "description", source = "event.description")
	@Mapping(target = "capacity", source = "event.capacity")
	@Mapping(target = "status", source = "event.status")
	@Mapping(target = "organization", source = "organization")
	@Mapping(target = "viewer", source = "viewer")
	@Mapping(target = "schedule", source = "schedule")
	@Mapping(target = "nextOccurrence", source = "nextOccurrence")
	@Mapping(target = "onlineUrl", source = "onlineUrl")
	@Mapping(target = "privateDetails", source = "privateDetails")
	@Mapping(target = "createdAt", source = "event.createdAt")
	@Mapping(target = "updatedAt", source = "event.updatedAt")
	EventResponse toResponse(Event event, Sport sport, AppUser author, Organization organization,
			List<OrganizerResponse> organizers, List<AppUser> participants, long participantsCount,
			List<FileResponse> photos, ViewerResponse viewer, String onlineUrl, String privateDetails,
			ScheduleResponse schedule, OccurrenceShortResponse nextOccurrence, OccurrenceResponse singleOccurrence);

	/** nextOccurrence — ближайшее подходящее занятие (null — нет): его время показывается вместо времени мероприятия. */
	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "status", source = "event.status")
	@Mapping(target = "startAt", expression = "java(nextOccurrence != null ? nextOccurrence.getStartAt() : event.getStartAt())")
	@Mapping(target = "endAt", expression = "java(nextOccurrence != null ? nextOccurrence.getEndAt() : event.getEndAt())")
	@Mapping(target = "occurrenceId", source = "nextOccurrence.id")
	@Mapping(target = "organizer", source = "organizer")
	@Mapping(target = "organization", source = "organization")
	@Mapping(target = "coverUrl", source = "cover.url")
	@Mapping(target = "coverFocus", source = "cover.focus")
	EventSummaryResponse toSummary(Event event, Sport sport, long participantsCount,
			RegistrationStatus myRegistrationStatus, FileResponse cover, EventOccurrence nextOccurrence,
			Long occurrenceAttendeesCount, String scheduleDescription, QuorumStatus quorumStatus,
			boolean cancelledByOrganizer, AppUser organizer, Organization organization);

	/** Точка на карте (GeoJSON Feature); на карту попадают только мероприятия с координатами. */
	@Mapping(target = "type", constant = "Feature")
	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "geometry", expression = "java(PointGeometry.of(event.getLon(), event.getLat()))")
	@Mapping(target = "properties",
			expression = "java(toMapProperties(event, sport, participantsCount, myRegistrationStatus, nextOccurrence, scheduleDescription))")
	EventMapFeature toMapFeature(Event event, Sport sport, long participantsCount,
			RegistrationStatus myRegistrationStatus, EventOccurrence nextOccurrence, String scheduleDescription);

	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "startAt", expression = "java(nextOccurrence != null ? nextOccurrence.getStartAt() : event.getStartAt())")
	@Mapping(target = "endAt", expression = "java(nextOccurrence != null ? nextOccurrence.getEndAt() : event.getEndAt())")
	@Mapping(target = "occurrenceId", source = "nextOccurrence.id")
	EventMapProperties toMapProperties(Event event, Sport sport, long participantsCount,
			RegistrationStatus myRegistrationStatus, EventOccurrence nextOccurrence, String scheduleDescription);

	@Mapping(target = "type", constant = "FeatureCollection")
	EventMapResponse toMapResponse(List<EventMapFeature> features, boolean truncated, int limit);

	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "createdAt", source = "event.createdAt")
	AdminEventResponse toAdmin(Event event, Sport sport, AppUser author, long participantsCount);

	/** Решения считает EventAccessPolicy; canRegister — когда нет причины отказа. Блок есть всегда, даже если все поля null. */
	@BeanMapping(nullValueMappingStrategy = NullValueMappingStrategy.RETURN_DEFAULT)
	@Mapping(target = "canRegister", expression = "java(registerBlockedReason == null)")
	ViewerResponse toViewer(RegistrationStatus registrationStatus, String registerBlockedReason, boolean isOrganizer,
			boolean canManage, boolean canManageOrganizers, boolean canCancel, boolean canSeePrivateDetails,
			boolean canComment, RegistrationStatus joinAs, Integer waitlistPosition, String decisionReason, boolean organizerInvite);
}
