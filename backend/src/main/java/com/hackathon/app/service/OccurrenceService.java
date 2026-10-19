package com.hackathon.app.service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import com.hackathon.app.domain.dto.OccurrenceRequest;
import com.hackathon.app.domain.dto.OccurrenceResponse;
import com.hackathon.app.domain.dto.OccurrenceShortResponse;
import com.hackathon.app.domain.dto.ScheduleResponse;
import com.hackathon.app.domain.dto.UserShortResponse;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.EventScheduleRule;
import com.hackathon.app.domain.entity.OccurrenceAttendance;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.OccurrenceSource;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.EventMapper;
import com.hackathon.app.domain.mapper.OccurrenceMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.EventScheduleRuleRepository;
import com.hackathon.app.repository.OccurrenceAttendanceRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.util.ScheduleDescriptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Занятия мероприятий. У разового — одно занятие с его временем, у серии — по правилам расписания плюс разовые даты.
 * Отметки «приду» и правка занятий идут под блокировкой строки мероприятия: последнее место не займут двое.
 * Все «можно ли» — в EventAccessPolicy.
 */
@Service
@RequiredArgsConstructor
public class OccurrenceService {

	static final String NOT_FOUND = "Занятие не найдено";
	/** Причина у занятий, которые пропали из расписания после правки правил, но на них уже отметились. */
	static final String SCHEDULE_CHANGED = "Расписание изменено";
	/** Верхняя граница «без конца» для запросов по периоду. */
	static final Instant FAR_FUTURE = Instant.parse("9999-12-31T00:00:00Z");

	private final EventOccurrenceRepository occurrences;
	private final EventScheduleRuleRepository scheduleRules;
	private final OccurrenceAttendanceRepository attendances;
	private final EventRepository events;
	private final RegistrationRepository registrations;
	private final DbTimeRepository dbTime;
	private final EventAccessPolicy policy;
	private final ScheduleExpander expander;
	private final OccurrenceMapper mapper;
	private final EventMapper eventMapper;
	private final UserMapper userMapper;
	private final NotificationChanges notificationChanges;

	/**
	 * После сохранения мероприятия приводит занятия к форме: разовому — одно занятие с его временем,
	 * серии — правила заменяются, занятия пересчитываются. startAt/endAt серии — по её первому занятию.
	 * plan — проверенное расписание из ScheduleExpander (null — разовое).
	 */
	@Transactional
	public void apply(Event event, ScheduleExpander.Expanded plan, Instant now) {
		if (plan == null) {
			syncSingle(event);
		} else {
			replaceRules(event, plan);
			syncSeries(event, plan, now);
			updateSpan(event);
		}
	}

	/** Занятия мероприятия в [from, to] с заполненностью и моими правами. Без from — с текущего момента. */
	@Transactional(readOnly = true)
	public List<OccurrenceResponse> list(UUID eventId, UUID userId, Instant from, Instant to) {
		var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
		var now = dbTime.now();
		var start = from != null ? from : now;
		var end = to != null ? to : FAR_FUTURE;
		if (end.isBefore(start)) {
			throw new BadRequestException("Конец периода должен быть не раньше начала");
		}
		var list = occurrences.findByEventIdAndStartAtBetweenOrderByStartAt(eventId, start, end);
		return responses(event, list, userId, now);
	}

	/** «Приду» на занятие серии; повторное нажатие ничего не меняет. */
	@Transactional
	public OccurrenceResponse attend(UUID eventId, UUID occurrenceId, UUID userId) {
		var event = lockEvent(eventId, userId);
		var occurrence = find(eventId, occurrenceId);
		var now = dbTime.now();
		if (attendances.findByOccurrenceIdAndUserId(occurrenceId, userId).isEmpty()) {
			var myRegistration = registrations.findByEventIdAndUserId(eventId, userId).orElse(null);
			var blocked = policy.attendBlockedReason(event, occurrence, userId, myRegistration, false,
					attendances.countByOccurrenceId(occurrenceId), now);
			if (blocked != null) {
				throw new ConflictException(blocked);
			}
			attendances.saveAndFlush(mapper.toAttendance(occurrenceId, eventId, userId));
		}
		return response(event, occurrence, userId, now);
	}

	/** Снять отметку; если её нет — ничего не меняется. */
	@Transactional
	public OccurrenceResponse unattend(UUID eventId, UUID occurrenceId, UUID userId) {
		var event = lockEvent(eventId, userId);
		var occurrence = find(eventId, occurrenceId);
		var now = dbTime.now();
		var mine = attendances.findByOccurrenceIdAndUserId(occurrenceId, userId);
		if (mine.isPresent() || !event.isRecurring()) {
			var blocked = policy.unattendBlockedReason(event, occurrence, mine.isPresent(), now);
			if (blocked != null) {
				throw new ConflictException(blocked);
			}
			attendances.delete(mine.get());
			attendances.flush();
		}
		return response(event, occurrence, userId, now);
	}

	/** Разовая дата серии вне правил: в будущем, в границах серии, не в одно время с другим занятием. */
	@Transactional
	public OccurrenceResponse add(UUID eventId, UUID userId, OccurrenceRequest request) {
		var event = manageable(eventId, userId);
		var now = dbTime.now();
		if (request.endAt() == null) {
			throw new BadRequestException("Укажите окончание занятия");
		}
		checkTime(event, request.startAt(), request.endAt(), now);
		if (occurrences.existsByEventIdAndStatusAndStartAt(eventId, OccurrenceStatus.SCHEDULED, request.startAt())) {
			throw new ConflictException("В это время у серии уже есть занятие");
		}
		if (occurrences.findByEventIdOrderByStartAt(eventId).size() >= ScheduleExpander.MAX_OCCURRENCES) {
			throw new ConflictException("В серии не может быть больше " + ScheduleExpander.MAX_OCCURRENCES + " занятий");
		}
		var added = occurrences.saveAndFlush(mapper.toOccurrence(eventId, request.startAt(), request.endAt(), null,
				OccurrenceSource.EXTRA));
		updateSpan(event);
		return response(event, added, userId, now);
	}

	/** Перенос одного занятия; отметки сохраняются. Без endAt длительность остаётся прежней. */
	@Transactional
	public OccurrenceResponse reschedule(UUID eventId, UUID occurrenceId, UUID userId, OccurrenceRequest request) {
		var event = manageable(eventId, userId);
		var occurrence = find(eventId, occurrenceId);
		var now = dbTime.now();
		var blocked = policy.changeOccurrenceBlockedReason(occurrence, now);
		if (blocked != null) {
			throw new ConflictException(blocked);
		}
		var endAt = request.endAt();
		if (endAt == null && occurrence.getEndAt() != null) {
			endAt = request.startAt().plus(Duration.between(occurrence.getStartAt(), occurrence.getEndAt()));
		}
		checkTime(event, request.startAt(), endAt, now);
		if (!request.startAt().equals(occurrence.getStartAt())
				&& occurrences.existsByEventIdAndStatusAndStartAt(eventId, OccurrenceStatus.SCHEDULED, request.startAt())) {
			throw new ConflictException("В это время у серии уже есть занятие");
		}
		mapper.retime(occurrence, request.startAt(), endAt);
		occurrences.saveAndFlush(occurrence);
		updateSpan(event);
		return response(event, occurrence, userId, now);
	}

	/**
	 * Отмена занятия (необратимо); отметки и записи остаются, участники видят причину. У разового мероприятия
	 * отменяется его единственное занятие — то есть всё мероприятие: оно уходит из ленты, запись закрывается.
	 */
	@Transactional
	public OccurrenceResponse cancel(UUID eventId, UUID occurrenceId, UUID userId, String reason) {
		var event = organizerLocked(eventId, userId, "Отменять занятия может только организатор");
		var occurrence = find(eventId, occurrenceId);
		var now = dbTime.now();
		var blocked = policy.cancelOccurrenceBlockedReason(event, occurrence, now);
		if (blocked != null) {
			throw new ConflictException(blocked);
		}
		mapper.cancel(occurrence, reason, now, userId);
		occurrences.saveAndFlush(occurrence);
		if (event.isRecurring()) {
			updateSpan(event);
		}
		return response(event, occurrence, userId, now);
	}

	/**
	 * «Состоится»: организатор подтверждает занятие, даже если кворум ещё не набран. Подтверждение не снимается;
	 * повторное нажатие ничего не меняет.
	 */
	@Transactional
	public OccurrenceResponse confirm(UUID eventId, UUID occurrenceId, UUID userId) {
		var event = organizerLocked(eventId, userId, "Подтверждать занятия может только организатор");
		var occurrence = find(eventId, occurrenceId);
		var now = dbTime.now();
		// отменённое, начавшееся или снятое — 409, даже если раньше его подтверждали
		var blocked = policy.confirmOccurrenceBlockedReason(event, occurrence, now);
		if (blocked != null) {
			throw new ConflictException(blocked);
		}
		if (occurrence.getConfirmedAt() == null) {
			mapper.confirm(occurrence, now, userId);
			occurrences.saveAndFlush(occurrence);
		}
		return response(event, occurrence, userId, now);
	}

	/** Занятие разового мероприятия для его карточки; у серии — null. */
	@Transactional(readOnly = true)
	public OccurrenceResponse single(Event event, UUID userId, Instant now) {
		if (event.isRecurring()) {
			return null;
		}
		return occurrences.findByEventIdOrderByStartAt(event.getId()).stream().findFirst()
				.map(occurrence -> response(event, occurrence, userId, now)).orElse(null);
	}

	/** Кто придёт на занятие — только организатору. У разового это подтверждённые участники. */
	@Transactional(readOnly = true)
	public List<UserShortResponse> attendees(UUID eventId, UUID occurrenceId, UUID userId) {
		var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
		if (!policy.isOrganizer(event, userId)) {
			throw new ForbiddenException("Кто придёт, видит только организатор");
		}
		find(eventId, occurrenceId);
		var users = event.isRecurring() ? attendances.findUsers(occurrenceId)
				: registrations.findUsers(eventId, RegistrationStatus.CONFIRMED);
		return users.stream().map(userMapper::toShort).toList();
	}

	/**
	 * Занятия для календаря .ics: будущие и неотменённые. У серии — мои отметки, а если их нет — все будущие
	 * (не больше лимита серии).
	 */
	@Transactional(readOnly = true)
	public List<EventOccurrence> calendarOccurrences(Event event, UUID userId, Instant now) {
		var upcoming = occurrences.findByEventIdOrderByStartAt(event.getId()).stream()
				.filter(o -> o.getStatus() == OccurrenceStatus.SCHEDULED && o.getStartAt().isAfter(now)).toList();
		if (!event.isRecurring() || upcoming.isEmpty()) {
			return upcoming;
		}
		var mine = attendances.findByUserIdAndOccurrenceIdIn(userId, upcoming.stream().map(EventOccurrence::getId).toList())
				.stream().map(OccurrenceAttendance::getOccurrenceId).collect(Collectors.toSet());
		return mine.isEmpty() ? upcoming : upcoming.stream().filter(o -> mine.contains(o.getId())).toList();
	}

	/** Расписание серии для карточки; у разового — null. */
	@Transactional(readOnly = true)
	public ScheduleResponse schedule(Event event) {
		if (!event.isRecurring()) {
			return null;
		}
		var rules = scheduleRules.findByEventIdOrderBySortOrder(event.getId());
		var ruleResponses = rules.stream()
				.map(rule -> mapper.toRuleResponse(rule, ScheduleDescriptions.describe(rule.getFirstStart(), rule.getRrule())))
				.toList();
		return eventMapper.toSchedule(event, ruleResponses, describe(rules));
	}

	/** Ближайшее будущее занятие, которое состоится; null — таких нет. */
	@Transactional(readOnly = true)
	public OccurrenceShortResponse next(Event event, Instant now) {
		return occurrences.findFirstByEventIdAndStatusAndStartAtAfterOrderByStartAt(event.getId(),
				OccurrenceStatus.SCHEDULED, now).map(mapper::toShort).orElse(null);
	}

	/** Описания расписаний для списка серий одним запросом: eventId → «по вторникам в 20:00». */
	@Transactional(readOnly = true)
	public Map<UUID, String> descriptions(List<Event> eventList) {
		var seriesIds = eventList.stream().filter(Event::isRecurring).map(Event::getId).toList();
		if (seriesIds.isEmpty()) {
			return Map.of();
		}
		return scheduleRules.findByEventIdInOrderBySortOrder(seriesIds).stream()
				.collect(Collectors.groupingBy(EventScheduleRule::getEventId)).entrySet().stream()
				.collect(Collectors.toMap(Map.Entry::getKey, entry -> describe(entry.getValue())));
	}

	/** Самое заполненное будущее занятие серии: лимит мест нельзя сделать меньше. */
	@Transactional(readOnly = true)
	public long maxFutureAttendance(UUID eventId, Instant now) {
		return attendances.futureCountsDesc(eventId, now).stream().findFirst().orElse(0L);
	}

	/** Мои ближайшие отмеченные занятия в сериях из списка: eventId → занятие. */
	@Transactional(readOnly = true)
	public Map<UUID, OccurrenceShortResponse> myNext(UUID userId, List<Event> eventList, Instant now) {
		var seriesIds = eventList.stream().filter(Event::isRecurring).map(Event::getId).toList();
		if (seriesIds.isEmpty()) {
			return Map.of();
		}
		// запрос отдаёт по порядку: первое по каждому мероприятию — ближайшее
		return attendances.findMyUpcoming(userId, seriesIds, now).stream()
				.collect(Collectors.toMap(EventOccurrence::getEventId, mapper::toShort, (first, second) -> first));
	}

	/** Участник вышел из серии или исключён: будущие отметки снимаются, прошлые остаются. */
	@Transactional
	public void dropFutureAttendance(UUID eventId, UUID userId, Instant now) {
		attendances.deleteFuture(eventId, userId, now);
	}

	private static String describe(List<EventScheduleRule> rules) {
		return ScheduleDescriptions.describe(rules.stream().map(EventScheduleRule::getFirstStart).toList(),
				rules.stream().map(EventScheduleRule::getRrule).toList());
	}

	private void syncSingle(Event event) {
		var existing = occurrences.findByEventIdOrderByStartAt(event.getId());
		if (existing.isEmpty()) {
			occurrences.saveAndFlush(mapper.toOccurrence(event.getId(), event.getStartAt(), event.getEndAt(), null,
					OccurrenceSource.SINGLE));
			return;
		}
		var single = existing.getFirst();
		mapper.retime(single, event.getStartAt(), event.getEndAt());
		occurrences.saveAndFlush(single);
	}

	private void replaceRules(Event event, ScheduleExpander.Expanded plan) {
		scheduleRules.deleteByEventId(event.getId());
		var rules = IntStream.range(0, plan.rules().size())
				.mapToObj(i -> {
					var rule = plan.rules().get(i);
					return mapper.toRule(event.getId(), i, rule.firstStart(), rule.durationMinutes(), rule.rrule());
				})
				.toList();
		scheduleRules.saveAllAndFlush(rules);
	}

	/**
	 * Прошедшие занятия не трогаем. Будущие из правил с тем же исходным временем остаются (с отметками, переносом,
	 * отменой; у не перенесённых обновляется окончание). Пропавшие из расписания: с отметками — отменяются
	 * («Расписание изменено»), без отметок — удаляются. Добавленные вручную даты не трогаем. Новые — создаются,
	 * если в это время у серии ещё нет занятия.
	 */
	private void syncSeries(Event event, ScheduleExpander.Expanded plan, Instant now) {
		Map<Instant, ScheduleExpander.Slot> slotByStart = plan.slots().stream()
				.collect(Collectors.toMap(ScheduleExpander.Slot::start, Function.identity()));
		var knownOriginals = new HashSet<Instant>();
		var scheduledStarts = new HashSet<Instant>();
		for (var occurrence : occurrences.findByEventIdOrderByStartAt(event.getId())) {
			if (occurrence.getSource() == OccurrenceSource.RULE && occurrence.getStartAt().isAfter(now)) {
				var slot = slotByStart.get(occurrence.getOriginalStartAt());
				if (slot == null) {
					if (!attendances.existsByOccurrenceId(occurrence.getId())) {
						occurrences.delete(occurrence);
						continue;
					}
					if (occurrence.getStatus() == OccurrenceStatus.SCHEDULED) {
						mapper.cancel(occurrence, SCHEDULE_CHANGED, now, null);
					}
				} else if (occurrence.getStatus() == OccurrenceStatus.SCHEDULED
						&& occurrence.getStartAt().equals(occurrence.getOriginalStartAt())
						&& !Objects.equals(occurrence.getEndAt(), slot.end())) {
					mapper.retime(occurrence, slot.start(), slot.end());
				}
			}
			if (occurrence.getOriginalStartAt() != null) {
				knownOriginals.add(occurrence.getOriginalStartAt());
			}
			if (occurrence.getStatus() == OccurrenceStatus.SCHEDULED) {
				scheduledStarts.add(occurrence.getStartAt());
			}
		}
		// удаления — до вставок: unique (event_id, original_start_at)
		occurrences.flush();
		var created = plan.after(now).stream()
				.filter(slot -> !knownOriginals.contains(slot.start()) && !scheduledStarts.contains(slot.start()))
				.map(slot -> mapper.toOccurrence(event.getId(), slot.start(), slot.end(), slot.start(),
						OccurrenceSource.RULE))
				.toList();
		occurrences.saveAllAndFlush(created);
	}

	/** startAt/endAt серии — первое занятие, которое состоится (а если все отменены — просто первое). */
	private void updateSpan(Event event) {
		var all = occurrences.findByEventIdOrderByStartAt(event.getId());
		all.stream()
				.min(Comparator.comparing((EventOccurrence o) -> o.getStatus() != OccurrenceStatus.SCHEDULED)
						.thenComparing(EventOccurrence::getStartAt))
				.ifPresent(first -> {
					eventMapper.span(event, first.getStartAt(), first.getEndAt());
					events.saveAndFlush(event);
				});
	}

	private void checkTime(Event event, Instant startAt, Instant endAt, Instant now) {
		if (!startAt.isAfter(now)) {
			throw new BadRequestException("Занятие должно быть в будущем");
		}
		if (endAt != null && !endAt.isAfter(startAt)) {
			throw new BadRequestException("Окончание должно быть позже начала");
		}
		var day = startAt.atZone(ZoneId.of(event.getTimeZone())).toLocalDate();
		if (day.isBefore(event.getSeriesStartDate()) || day.isAfter(event.getSeriesEndDate())) {
			throw new BadRequestException("Дата занятия должна попадать в границы серии");
		}
	}

	/** Блокировка мероприятия и снимок для уведомлений: изменения этой команды сравнятся перед commit. */
	private Event lockEvent(UUID eventId, UUID userId) {
		var event = events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
		notificationChanges.watch(eventId, userId);
		return event;
	}

	private EventOccurrence find(UUID eventId, UUID occurrenceId) {
		return occurrences.findByIdAndEventId(occurrenceId, eventId)
				.orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
	}

	/** Мероприятие под блокировкой; действие доступно только организатору (иначе 403). */
	private Event organizerLocked(UUID eventId, UUID userId, String forbidden) {
		var event = lockEvent(eventId, userId);
		if (!policy.isOrganizer(event, userId)) {
			throw new ForbiddenException(forbidden);
		}
		return event;
	}

	/** Мероприятие под блокировкой; переносить и добавлять даты может только организатор (иначе 403) серии (иначе 409). */
	private Event manageable(UUID eventId, UUID userId) {
		var event = organizerLocked(eventId, userId, "Менять занятия может только организатор");
		var blocked = policy.manageOccurrencesBlockedReason(event);
		if (blocked != null) {
			throw new ConflictException(blocked);
		}
		return event;
	}

	private OccurrenceResponse response(Event event, EventOccurrence occurrence, UUID userId, Instant now) {
		return responses(event, List.of(occurrence), userId, now).getFirst();
	}

	/** Счётчики и мои отметки — по одному запросу на весь список. */
	private List<OccurrenceResponse> responses(Event event, List<EventOccurrence> list, UUID userId, Instant now) {
		if (list.isEmpty()) {
			return List.of();
		}
		var myRegistration = registrations.findByEventIdAndUserId(event.getId(), userId).orElse(null);
		var ids = list.stream().map(EventOccurrence::getId).toList();
		Map<UUID, Long> countById;
		Set<UUID> mine;
		if (event.isRecurring()) {
			countById = attendances.countByOccurrenceIds(ids).stream()
					.collect(Collectors.toMap(OccurrenceAttendanceRepository.OccurrenceCount::getOccurrenceId,
							OccurrenceAttendanceRepository.OccurrenceCount::getCount));
			mine = attendances.findByUserIdAndOccurrenceIdIn(userId, ids).stream()
					.map(OccurrenceAttendance::getOccurrenceId).collect(Collectors.toSet());
		} else {
			// у разового «кто придёт» — подтверждённые записи
			long confirmed = registrations.countByEventIdAndStatus(event.getId(), RegistrationStatus.CONFIRMED);
			countById = ids.stream().collect(Collectors.toMap(Function.identity(), id -> confirmed));
			mine = isConfirmed(myRegistration) ? new HashSet<>(ids) : Set.of();
		}
		return list.stream().map(occurrence -> {
			boolean attending = mine.contains(occurrence.getId());
			long count = countById.getOrDefault(occurrence.getId(), 0L);
			var viewer = mapper.toViewer(attending,
					policy.attendBlockedReason(event, occurrence, userId, myRegistration, attending, count, now),
					policy.unattendBlockedReason(event, occurrence, attending, now) == null,
					policy.canCancelOccurrence(event, occurrence, userId, now),
					policy.canRescheduleOccurrence(event, occurrence, userId, now),
					policy.canConfirmOccurrence(event, occurrence, userId, now));
			var quorumStatus = policy.quorumStatus(event, occurrence, count);
			var quorum = quorumStatus == null ? null
					: mapper.toQuorum(event.getMinParticipants(), count, quorumStatus);
			return mapper.toResponse(occurrence, count, event.getCapacity(), quorum, viewer);
		}).toList();
	}

	private static boolean isConfirmed(Registration registration) {
		return registration != null && registration.getStatus() == RegistrationStatus.CONFIRMED;
	}
}
