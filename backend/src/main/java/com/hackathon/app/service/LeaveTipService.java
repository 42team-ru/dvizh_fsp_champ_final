package com.hackathon.app.service;

import static com.hackathon.app.util.NotificationTimes.stored;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.dto.HomePoint;
import com.hackathon.app.domain.dto.LeaveReminderResponse;
import com.hackathon.app.domain.dto.LeaveTipResponse;
import com.hackathon.app.domain.dto.SetLeaveReminderRequest;
import com.hackathon.app.domain.dto.TravelOptionResponse;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.PersonalReminder;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.NotificationCategory;
import com.hackathon.app.domain.enums.NotificationType;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.domain.enums.PersonalReminderStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.enums.TravelMode;
import com.hackathon.app.domain.enums.TravelSource;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.LeaveTipMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.OccurrenceAttendanceRepository;
import com.hackathon.app.repository.PersonalReminderRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.UserPreferencesRepository;
import com.hackathon.app.util.Geo;
import com.hackathon.app.util.Strings;
import com.hackathon.app.util.TravelEstimate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * «Бублик подсказывает»: когда выходить на ближайшее подтверждённое занятие и личное напоминание к этому времени.
 * Время в пути — маршрут 2ГИС ({@link DgisRouting}), без ключа или при ошибке — оценка {@link TravelEstimate}.
 * Напоминание приходит обычным REMINDER (категория «Напоминания»), поэтому уважает настройки каналов.
 */
@Service
@RequiredArgsConstructor
public class LeaveTipService {

	/** Запас к дороге: выйти чуть раньше. */
	static final int BUFFER_MINUTES = 5;
	/** Без дома — напомнить за час до начала. */
	static final int NO_HOME_MINUTES = 60;
	/** Онлайн — напомнить за 15 минут. */
	static final int ONLINE_MINUTES = 15;
	/** Раньше этого до начала напоминание не ставим. */
	static final Duration MAX_AHEAD = Duration.ofHours(12);
	private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");
	private static final Map<TravelMode, String> HOW = Map.of(TravelMode.WALK, "пешком", TravelMode.BUS, "на автобусе",
			TravelMode.CAR, "на машине");

	/** Ближайшее моё занятие. */
	private record Slot(Event event, UUID occurrenceId, Instant startAt) {}

	private final AppUserRepository users;
	private final UserPreferencesRepository preferences;
	private final RegistrationRepository registrations;
	private final EventRepository events;
	private final EventOccurrenceRepository occurrences;
	private final OccurrenceAttendanceRepository attendances;
	private final OccurrenceService occurrenceService;
	private final EventAccessPolicy policy;
	private final PersonalReminderRepository reminders;
	private final LeaveTipMapper mapper;
	private final DgisRouting routing;
	private final NotificationPublisher publisher;
	private final DbTimeRepository dbTime;
	private final NotificationProperties notificationProperties;

	/**
	 * Подсказка на ближайшее занятие; null — подсказки нет (не участник-человек, помощник «Напоминания» выключен,
	 * впереди ничего). Без транзакции: маршруты 2ГИС — внешние вызовы, соединение с БД на них не держим.
	 */
	public LeaveTipResponse tip(UUID userId) {
		var user = users.findById(userId).orElseThrow();
		if (user.getSystemRole() != SystemRole.USER) return null;
		var prefs = preferences.findByUserId(userId).orElse(null);
		// до первого сохранения предпочтений помощники включены
		if (prefs != null && !prefs.isReminders()) return null;
		var now = dbTime.now();
		var slot = nearest(userId, now);
		if (slot == null) return null;
		var event = slot.event();
		var start = slot.startAt();
		var reminder = reminders.findByUserIdAndOccurrenceId(userId, slot.occurrenceId())
				.filter(r -> r.getStatus() != PersonalReminderStatus.CANCELLED)
				.filter(r -> r.getExpectedStartAt().equals(stored(start)))
				.map(mapper::toResponse).orElse(null);

		boolean offline = event.getFormat() == EventFormat.OFFLINE && event.getLat() != null && event.getLon() != null;
		var home = prefs == null || prefs.getHomeLat() == null ? null : new HomePoint(prefs.getHomeLat(), prefs.getHomeLon());
		if (!offline || home == null) {
			var minutes = offline ? NO_HOME_MINUTES : ONLINE_MINUTES;
			return mapper.tip(event.getId(), slot.occurrenceId(), event.getTitle(), start, event.getFormat(), place(event),
					event.getLat(), event.getLon(), home, null, List.of(), TravelMode.NONE,
					start.minus(Duration.ofMinutes(minutes)), reminder);
		}
		var from = new Geo.Point(home.lat(), home.lon());
		var to = new Geo.Point(event.getLat(), event.getLon());
		var distance = Geo.distanceKm(from, to);
		var options = options(from, to, distance, start, zone(event));
		var recommended = recommended(options);
		var minutes = options.stream().filter(o -> o.mode() == recommended).findFirst().orElseThrow().minutes();
		return mapper.tip(event.getId(), slot.occurrenceId(), event.getTitle(), start, event.getFormat(), place(event),
				event.getLat(), event.getLon(), home, Math.round(distance * 10) / 10.0, options, recommended,
				start.minus(Duration.ofMinutes(minutes + BUFFER_MINUTES)), reminder);
	}

	/** «Напомнить»: личное напоминание на занятие; повторный вызов заменяет время и способ. */
	@Transactional
	public LeaveReminderResponse remind(UUID userId, UUID occurrenceId, SetLeaveReminderRequest request) {
		var occurrence = occurrences.findById(occurrenceId).orElseThrow(() -> new NoSuchElementException("Занятие не найдено"));
		var event = events.findById(occurrence.getEventId()).orElseThrow(() -> new NoSuchElementException("Занятие не найдено"));
		var now = dbTime.now();
		requireParticipant(userId, event, occurrence, now);
		var start = occurrence.getStartAt();
		if (!request.dueAt().isAfter(now)) throw new BadRequestException("Время напоминания уже прошло");
		if (!request.dueAt().isBefore(start)) throw new BadRequestException("Напомнить нужно до начала занятия");
		if (request.dueAt().isBefore(start.minus(MAX_AHEAD)))
			throw new BadRequestException("Напомнить можно не раньше чем за 12 часов до начала");
		var travelMinutes = request.travelMode() == TravelMode.NONE ? null : request.travelMinutes();
		return mapper.toResponse(save(userId, event, occurrence, request.dueAt(), PersonalReminderStatus.SCHEDULED,
				travelMinutes, request.travelMode()));
	}

	/** Отменить поставленное напоминание. */
	@Transactional
	public void cancel(UUID userId, UUID occurrenceId) {
		var reminder = reminders.findByUserIdAndOccurrenceId(userId, occurrenceId)
				.filter(r -> r.getStatus() == PersonalReminderStatus.SCHEDULED)
				.orElseThrow(() -> new NoSuchElementException("Напоминание не найдено"));
		mapper.status(reminder, PersonalReminderStatus.CANCELLED);
	}

	/** «Не надо»: подсказку на это занятие больше не показываем (и поставленное напоминание снимается). */
	@Transactional
	public void dismiss(UUID userId, UUID occurrenceId) {
		var occurrence = occurrences.findById(occurrenceId).orElseThrow(() -> new NoSuchElementException("Занятие не найдено"));
		var event = events.findById(occurrence.getEventId()).orElseThrow(() -> new NoSuchElementException("Занятие не найдено"));
		requireParticipant(userId, event, occurrence, dbTime.now());
		save(userId, event, occurrence, null, PersonalReminderStatus.DISMISSED, null, null);
	}

	/** Напоминания, которым пора уйти. */
	public List<UUID> due() {
		return reminders.due(dbTime.now(), PageRequest.of(0, 100));
	}

	/** Отправить одно напоминание или отменить, если оно потеряло смысл (перенос, отмена, снятие, выход из записи). */
	@Transactional
	public void process(UUID id) {
		var reminder = reminders.lock(id).orElse(null);
		if (reminder == null || reminder.getStatus() != PersonalReminderStatus.SCHEDULED) return;
		var now = dbTime.now();
		if (reminder.getDueAt().isAfter(now)) return;
		var occurrence = occurrences.findById(reminder.getOccurrenceId()).orElse(null);
		var event = events.findById(reminder.getEventId()).orElse(null);
		boolean actual = occurrence != null && event != null && participant(reminder.getUserId(), event, occurrence)
				&& event.getStatus() == EventStatus.PUBLISHED && !policy.isOrganizationSuspended(event)
				&& occurrence.getStatus() == OccurrenceStatus.SCHEDULED
				&& stored(occurrence.getStartAt()).equals(reminder.getExpectedStartAt())
				&& occurrence.getStartAt().isAfter(now)
				&& !reminder.getDueAt().plusSeconds(notificationProperties.reminderGraceSeconds()).isBefore(now);
		if (!actual) {
			mapper.status(reminder, PersonalReminderStatus.CANCELLED);
			return;
		}
		var time = HH_MM.withZone(zone(event)).format(occurrence.getStartAt());
		var travel = reminder.getTravelMode() == null || reminder.getTravelMode() == TravelMode.NONE
				? null : HOW.get(reminder.getTravelMode());
		var title = travel == null ? "Скоро встреча" : "Пора выходить";
		var body = travel == null || reminder.getTravelMinutes() == null
				? event.getTitle() + " в " + time + "\nДо начала " + Duration.between(now, occurrence.getStartAt()).toMinutes() + " мин."
				: event.getTitle() + " в " + time + "\nДо места ~" + reminder.getTravelMinutes() + " мин " + travel;
		publisher.publish(List.of(new NotificationFact("personal-reminder:" + id + ":" + reminder.getDueAt().getEpochSecond(),
				Set.of(reminder.getUserId()), null, NotificationType.REMINDER, NotificationCategory.REMINDERS, title, body,
				"/events/" + event.getId(), event.getId(), occurrence.getId(), null, stored(occurrence.getStartAt()))));
		mapper.status(reminder, PersonalReminderStatus.SENT);
	}

	/** Пешком, на автобусе, на машине: маршрут 2ГИС на время выхода или оценка по расстоянию. */
	private List<TravelOptionResponse> options(Geo.Point from, Geo.Point to, double distance, Instant start, ZoneId zone) {
		var result = new ArrayList<TravelOptionResponse>();
		for (var estimate : TravelEstimate.minutes(distance).entrySet()) {
			var departAt = start.minus(Duration.ofMinutes(estimate.getValue() + BUFFER_MINUTES));
			var route = routing.route(estimate.getKey(), from, to, departAt, zone);
			result.add(route
					.map(r -> mapper.option(estimate.getKey(), r.minutes(), r.available(), r.note(), TravelSource.ROUTE))
					.orElseGet(() -> mapper.option(estimate.getKey(), estimate.getValue(), true, null, TravelSource.ESTIMATE)));
		}
		return result;
	}

	/** Пешком, если недалеко; иначе автобус, если ходит; иначе машина. */
	private static TravelMode recommended(List<TravelOptionResponse> options) {
		var walk = options.stream().filter(o -> o.mode() == TravelMode.WALK).findFirst().orElseThrow();
		if (walk.minutes() <= TravelEstimate.WALK_LIMIT_MINUTES) return TravelMode.WALK;
		return options.stream().anyMatch(o -> o.mode() == TravelMode.BUS && o.available()) ? TravelMode.BUS : TravelMode.CAR;
	}

	/** Ближайшее будущее занятие среди моих подтверждённых записей: у серии — с моей отметкой «приду». */
	private Slot nearest(UUID userId, Instant now) {
		var eventIds = registrations.findByUserIdOrderByCreatedAtDesc(userId).stream()
				.filter(r -> r.getStatus() == RegistrationStatus.CONFIRMED).map(Registration::getEventId).toList();
		var mine = events.findAllById(eventIds).stream()
				.filter(e -> e.getStatus() == EventStatus.PUBLISHED && !policy.isOrganizationSuspended(e)).toList();
		var series = occurrenceService.myNext(userId, mine, now);
		return mine.stream().map(e -> {
			if (e.isRecurring()) {
				var next = series.get(e.getId());
				return next == null ? null : new Slot(e, next.id(), next.startAt());
			}
			return occurrences.findFirstByEventIdAndStatusAndStartAtAfterOrderByStartAt(e.getId(), OccurrenceStatus.SCHEDULED, now)
					.map(o -> new Slot(e, o.getId(), o.getStartAt())).orElse(null);
		}).filter(java.util.Objects::nonNull).min(Comparator.comparing(Slot::startAt)).orElse(null);
	}

	private void requireParticipant(UUID userId, Event event, EventOccurrence occurrence, Instant now) {
		if (!participant(userId, event, occurrence))
			throw new ConflictException("Напоминание можно поставить только на занятие, куда вы идёте");
		if (event.getStatus() != EventStatus.PUBLISHED || policy.isOrganizationSuspended(event)
				|| occurrence.getStatus() != OccurrenceStatus.SCHEDULED)
			throw new ConflictException("Занятие отменено или снято с публикации");
		if (!occurrence.getStartAt().isAfter(now)) throw new ConflictException("Занятие уже началось");
	}

	/** Подтверждённая запись; у серии — ещё и отметка «приду» на это занятие. */
	private boolean participant(UUID userId, Event event, EventOccurrence occurrence) {
		boolean confirmed = registrations.findByEventIdAndUserId(event.getId(), userId)
				.map(r -> r.getStatus() == RegistrationStatus.CONFIRMED).orElse(false);
		return confirmed && (!event.isRecurring()
				|| attendances.findByOccurrenceIdAndUserId(occurrence.getId(), userId).isPresent());
	}

	private PersonalReminder save(UUID userId, Event event, EventOccurrence occurrence, Instant dueAt,
			PersonalReminderStatus status, Integer travelMinutes, TravelMode travelMode) {
		var existing = reminders.findByUserIdAndOccurrenceId(userId, occurrence.getId());
		if (existing.isPresent()) {
			mapper.decide(existing.get(), stored(occurrence.getStartAt()), dueAt, status, travelMinutes, travelMode);
			return existing.get();
		}
		return reminders.save(mapper.reminder(userId, event.getId(), occurrence.getId(), stored(occurrence.getStartAt()),
				dueAt, status, travelMinutes, travelMode));
	}

	private ZoneId zone(Event event) {
		return ZoneId.of(event.getTimeZone() == null ? notificationProperties.timeZone() : event.getTimeZone());
	}

	private static String place(Event event) {
		if (event.getFormat() == EventFormat.ONLINE) return null;
		var address = Strings.blankToNull(event.getAddress());
		return address != null ? address : Strings.blankToNull(event.getLocationNote());
	}
}
