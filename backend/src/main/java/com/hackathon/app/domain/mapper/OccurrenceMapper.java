package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

import com.hackathon.app.domain.dto.OccurrenceResponse;
import com.hackathon.app.domain.dto.OccurrenceShortResponse;
import com.hackathon.app.domain.dto.OccurrenceViewerResponse;
import com.hackathon.app.domain.dto.QuorumResponse;
import com.hackathon.app.domain.dto.ScheduleRuleResponse;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.EventScheduleRule;
import com.hackathon.app.domain.entity.OccurrenceAttendance;
import com.hackathon.app.domain.enums.OccurrenceSource;
import com.hackathon.app.domain.enums.QuorumStatus;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValueMappingStrategy;

@Mapper(config = MappingConfig.class, imports = QuorumStatus.class)
public interface OccurrenceMapper {

	/** Новое занятие всегда состоится; originalStartAt — время по правилу (null — не из правила). */
	@Mapping(target = "status", constant = "SCHEDULED")
	EventOccurrence toOccurrence(UUID eventId, Instant startAt, Instant endAt, Instant originalStartAt,
			OccurrenceSource source);

	/** Новое время: перенос, правка разового мероприятия или длительности в правиле. */
	void retime(@MappingTarget EventOccurrence occurrence, Instant startAt, Instant endAt);

	/** Отмена необратима; cancelledById = null — отменено правкой расписания. */
	@Mapping(target = "status", constant = "CANCELLED")
	void cancel(@MappingTarget EventOccurrence occurrence, String cancelReason, Instant cancelledAt,
			UUID cancelledById);

	/** Организатор подтвердил: занятие состоится. */
	void confirm(@MappingTarget EventOccurrence occurrence, Instant confirmedAt, UUID confirmedById);

	@Mapping(target = "takesPlace", expression = "java(status != QuorumStatus.GATHERING)")
	QuorumResponse toQuorum(int required, long count, QuorumStatus status);

	EventScheduleRule toRule(UUID eventId, int sortOrder, LocalDateTime firstStart, int durationMinutes, String rrule);

	OccurrenceAttendance toAttendance(UUID occurrenceId, UUID eventId, UUID userId);

	OccurrenceShortResponse toShort(EventOccurrence occurrence);

	@Mapping(target = "status", source = "occurrence.status")
	@Mapping(target = "rescheduled",
			expression = "java(occurrence.getOriginalStartAt() != null && !occurrence.getOriginalStartAt().equals(occurrence.getStartAt()))")
	OccurrenceResponse toResponse(EventOccurrence occurrence, long attendeesCount, Integer capacity,
			QuorumResponse quorum, OccurrenceViewerResponse viewer);

	/** Решения считает EventAccessPolicy; canAttend — когда нет причины отказа. Блок есть всегда, даже если причина null. */
	@BeanMapping(nullValueMappingStrategy = NullValueMappingStrategy.RETURN_DEFAULT)
	@Mapping(target = "canAttend", expression = "java(attendBlockedReason == null)")
	OccurrenceViewerResponse toViewer(boolean attending, String attendBlockedReason, boolean canUnattend,
			boolean canCancel, boolean canReschedule, boolean canConfirm);

	ScheduleRuleResponse toRuleResponse(EventScheduleRule rule, String description);
}
