package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.RegistrationStatus.*;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Map;

import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.OccurrenceResponse;
import com.hackathon.app.domain.dto.ScheduleRequest;
import com.hackathon.app.domain.dto.ScheduleRuleRequest;
import com.hackathon.app.domain.enums.OccurrenceSource;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.e2e.support.Actor;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/** Сквозные сценарии серии: поиск по датам, отметки, права и изменение расписания. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class EventSeriesE2ETest {
	private static final ZoneId ZONE = ZoneId.of("Asia/Krasnoyarsk");
	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;
	private TestApi api;
	private LocalDate start;

	@BeforeEach
	void setUp() {
		api = new TestApi(mvc, json, users, passwords);
		start = LocalDate.now(ZONE).plusWeeks(2).with(TemporalAdjusters.nextOrSame(DayOfWeek.TUESDAY));
	}

	/**
	 * ФЛОУ: участник находит серию по дате и выбирает занятия независимо от остальных участников.
	 * ШАГИ:
	 *   1. Автор создаёт FREE-серию по вторникам и раз в две недели по воскресеньям с одним местом на занятие.
	 *   2. Второй пользователь открывает карточку, ищет серию в дни с занятием и без него и за весь период.
	 *   3. Два пользователя вступают; первый занимает занятие, второй получает отказ и выбирает другую дату.
	 *   4. Организатор смотрит именной список; участнику доступ к этому списку запрещён.
	 * ПРОВЕРЯЕМ: описание, ближайшее занятие, отсутствие дублей в ленте, время подходящей даты,
	 *   CONFIRMED обоих участников при capacity=1, счётчики и разграничение доступа к списку.
	 * ПОЧЕМУ ВАЖНО: серия должна находиться по каждой своей дате, а место занимается только на выбранное занятие.
	 */
	@Test
	void seriesAppearsOnOccurrenceDatesAndCapacityAppliesToEachOccurrence() {
		var author = api.newUser("seriesAuthor");
		var participant = api.newUser("seriesParticipant");
		var other = api.newUser("seriesOther");
		var form = seriesForm().capacity(1);
		var id = author.createEvent(form).id();
		var dates = participant.occurrences(id);
		assertThat(dates).hasSize(8); // шесть вторников и два воскресенья со своим DTSTART
		var first = dates.getFirst();
		var second = dates.get(1);
		var card = participant.openEvent(id);
		assertThat(card.recurring()).isTrue();
		assertThat(card.schedule().description()).contains("по вторникам в 20:00", "раз в 2 недели");
		assertThat(card.nextOccurrence().id()).isEqualTo(first.id());

		// Берём не первое занятие: лента должна подставлять время выбранного периода.
		var day = second.startAt().atZone(ZONE).toLocalDate();
		assertThat(feed(participant, form, day, day)).singleElement().satisfies(event -> {
			assertThat(event.id()).isEqualTo(id);
			assertThat(event.startAt()).isEqualTo(second.startAt());
		});
		assertThat(feed(participant, form, start.plusDays(1), start.plusDays(1))).isEmpty();
		assertThat(feed(participant, form, start, start.plusWeeks(5))).hasSize(1);

		// Вступление не занимает место на всех датах серии.
		assertThat(participant.joinEvent(id).status()).isEqualTo(CONFIRMED);
		assertThat(participant.attend(id, first.id()).attendeesCount()).isEqualTo(1);
		assertThat(other.joinEvent(id).status()).isEqualTo(CONFIRMED);
		assertThatApi(() -> other.attend(id, first.id())).fails(CONFLICT, "Мест нет");
		assertThat(other.attend(id, second.id()).attendeesCount()).isEqualTo(1);
		assertThat(author.attendees(id, first.id())).singleElement().satisfies(user ->
				assertThat(user.username()).isEqualTo(participant.username()));
		assertThatApi(() -> participant.attendees(id, first.id())).fails(FORBIDDEN);
		assertThat(find(author.occurrences(id), first).attendeesCount()).isEqualTo(1);
	}

	/**
	 * ФЛОУ: неверное расписание и недопустимые изменения не создают серию и не нарушают занятые места.
	 * ШАГИ:
	 *   1. Создать серию; запретить отметки без вступления и самому организатору.
	 *   2. Отклонить HOURLY, сломанный RRULE, период длиннее года и startAt вместе с schedule.
	 *   3. Создать разовое событие; запретить превращение разового в серию и обратно и отметку на разовом.
	 *   4. Два участника занимают одну дату; уменьшение capacity до одного отклоняется, данные перечитываются.
	 * ПРОВЕРЯЕМ: HTTP 400/409 с осмысленными причинами, неизменность типа события, расписания и двух отметок.
	 * ПОЧЕМУ ВАЖНО: ошибки формы не должны сохранять частичные данные или лишать уже записанных людей места.
	 */
	@Test
	void invalidSchedulesAndIncompatibleChangesAreRejectedWithoutLosingAttendance() {
		var author = api.newUser("boundaryAuthor");
		var first = api.newUser("boundaryFirst");
		var second = api.newUser("boundarySecond");
		var form = seriesForm().capacity(2);
		var id = author.createEvent(form).id();
		var occurrence = author.occurrences(id).getFirst();
		assertThat(assertThatApi(() -> first.attend(id, occurrence.id())).fails(CONFLICT).detail())
				.contains("сначала запишитесь");
		assertThat(assertThatApi(() -> author.attend(id, occurrence.id())).fails(CONFLICT).detail())
				.contains("Организатор");

		// Невалидное расписание не создаёт частичных данных.
		for (var rrule : List.of("FREQ=HOURLY", "FREQ=NOT_A_FREQUENCY")) {
			var invalid = seriesForm().schedule(schedule(List.of(rule(start, 20, rrule)), start.plusWeeks(5)));
			assertThat(assertThatApi(() -> author.createEvent(invalid)).fails(BAD_REQUEST).detail()).isNotEmpty();
		}
		var tooLong = seriesForm().schedule(schedule(rules(), start.plusYears(1).plusDays(1)));
		assertThat(assertThatApi(() -> author.createEvent(tooLong)).fails(BAD_REQUEST).detail())
				.contains("не больше года");
		var mixed = seriesForm().startsAt(at(start, 20));
		assertThat(assertThatApi(() -> author.createEvent(mixed)).fails(BAD_REQUEST).detail())
				.contains("не передавайте startAt и endAt");

		// Тип события неизменяем; разовое событие не поддерживает отметки серии.
		var singleForm = EventForm.free();
		var singleId = author.createEvent(singleForm).id();
		assertThatApi(() -> author.updateEvent(singleId, form)).fails(CONFLICT);
		assertThatApi(() -> author.updateEvent(id, singleForm)).fails(CONFLICT);
		first.joinEvent(singleId);
		var singleOccurrence = first.occurrences(singleId).getFirst();
		assertThat(assertThatApi(() -> first.attend(singleId, singleOccurrence.id())).fails(CONFLICT).detail())
				.contains("разовое");
		for (var participant : List.of(first, second)) {
			participant.joinEvent(id);
			participant.attend(id, occurrence.id());
		}
		var lowered = seriesForm().title(form.get("title").toString()).capacity(1);
		assertThat(assertThatApi(() -> author.updateEvent(id, lowered)).fails(CONFLICT).detail())
				.contains("лимит мест не может быть меньше");
		var card = author.openEvent(id);
		assertThat(card.recurring()).isTrue();
		assertThat(card.capacity()).isEqualTo(2);
		var saved = author.occurrences(id);
		assertThat(saved).hasSize(8);
		assertThat(find(saved, occurrence).attendeesCount()).isEqualTo(2);
		assertThat(author.openEvent(singleId).recurring()).isFalse();
	}

	/**
	 * ФЛОУ: организатор меняет занятия и правила, участник выходит, а заявки управляют правом отмечаться.
	 * ШАГИ:
	 *   1. Вступить в серию и отметить отменяемый вторник, переносимый вторник и воскресенье.
	 *   2. Отменить занятие с причиной; запретить снятие отметки и повторную отмену.
	 *   3. Запретить перенос чужому пользователю, в прошлое и за границу; перенести без endAt и добавить EXTRA.
	 *   4. Удалить воскресное правило: занятие с отметкой отменяется, без отметки исчезает;
	 *      перенесённый вторник и дополнительная дата сохраняются. Участник выходит — будущие отметки исчезают.
	 *   5. В REQUEST-серии заявка ждёт решения и не даёт отметиться; после одобрения отметка доступна,
	 *      после исключения будущая отметка удаляется.
	 * ПРОВЕРЯЕМ: статусы, причины, идентичность занятий, сохранение длительности и отметок при переносе,
	 *   неизменность ручной даты, счётчики после выхода и исключения, переходы PENDING/CONFIRMED/REJECTED.
	 * ПОЧЕМУ ВАЖНО: правка расписания должна сохранять выбор людей и явно сообщать отмены,
	 *   а ушедшие или исключённые участники не должны занимать будущие места.
	 */
	@Test
	void organizerChangesPreserveAttendanceAndLeavingOrRejectionClearsFuturePlaces() {
		var author = api.newUser("editAuthor");
		var participant = api.newUser("editParticipant");
		var form = seriesForm();
		var id = author.createEvent(form).id();
		participant.joinEvent(id);
		var original = author.occurrences(id);
		var tuesdays = onDay(original, DayOfWeek.TUESDAY);
		var sundays = onDay(original, DayOfWeek.SUNDAY);
		var cancelled = tuesdays.get(0);
		var moved = tuesdays.get(1);
		var dropped = sundays.get(0);
		var removed = sundays.get(1);
		for (var occurrence : List.of(cancelled, moved, dropped)) {
			assertThat(participant.attend(id, occurrence.id()).attendeesCount()).isEqualTo(1);
		}

		// Отмена сохраняет отметки и объясняет запрет дальнейших действий.
		var cancellation = author.cancelOccurrence(id, cancelled.id(), "Площадка закрыта");
		assertThat(cancellation.status()).isEqualTo(OccurrenceStatus.CANCELLED);
		assertThat(cancellation.cancelReason()).isEqualTo("Площадка закрыта");
		assertThat(cancellation.attendeesCount()).isEqualTo(1);
		assertThatApi(() -> participant.unattend(id, cancelled.id())).fails(CONFLICT, "Занятие отменено");
		assertThatApi(() -> author.cancelOccurrence(id, cancelled.id(), "Повторная отмена")).fails(CONFLICT);

		// Перенос сохраняет длительность и людей; ручная дата не зависит от правил.
		var newStart = moved.startAt().plus(Duration.ofDays(1));
		assertThatApi(() -> participant.rescheduleOccurrence(id, moved.id(), newStart)).fails(FORBIDDEN);
		assertThatApi(() -> author.rescheduleOccurrence(id, moved.id(), Instant.now().minusSeconds(3600)))
				.fails(BAD_REQUEST);
		assertThatApi(() -> author.rescheduleOccurrence(id, moved.id(), at(start.plusWeeks(6), 20)))
				.fails(BAD_REQUEST);
		var duration = Duration.between(moved.startAt(), moved.endAt());
		var rescheduled = author.rescheduleOccurrence(id, moved.id(), newStart);
		assertThat(rescheduled.rescheduled()).isTrue();
		assertThat(rescheduled.startAt()).isEqualTo(newStart);
		assertThat(rescheduled.endAt()).isEqualTo(newStart.plus(duration));
		assertThat(rescheduled.attendeesCount()).isEqualTo(1);
		var extraStart = at(start.plusDays(2), 12);
		var extraEnd = extraStart.plusSeconds(3600);
		var extra = author.addOccurrence(id, extraStart, extraEnd);
		assertThat(extra.source()).isEqualTo(OccurrenceSource.EXTRA);
		assertThatApi(() -> author.addOccurrence(id, extraStart, extraEnd)).fails(CONFLICT);
		participant.attend(id, extra.id());
		form.schedule(schedule(List.of(rules().getFirst()), start.plusWeeks(5)));
		author.updateEvent(id, form);

		// При удалении правила занятая дата отменяется, пустая исчезает.
		var changed = participant.occurrences(id);
		var savedDropped = find(changed, dropped);
		assertThat(savedDropped.status()).isEqualTo(OccurrenceStatus.CANCELLED);
		assertThat(savedDropped.cancelReason()).isEqualTo("Расписание изменено");
		assertThat(savedDropped.attendeesCount()).isEqualTo(1);
		assertThat(changed).noneMatch(o -> o.id().equals(removed.id()));
		var savedMoved = find(changed, moved);
		assertThat(savedMoved.startAt()).isEqualTo(newStart);
		assertThat(savedMoved.rescheduled()).isTrue();
		assertThat(savedMoved.endAt()).isEqualTo(newStart.plus(duration));
		assertThat(savedMoved.attendeesCount()).isEqualTo(1);
		var savedExtra = find(changed, extra);
		assertThat(savedExtra.source()).isEqualTo(OccurrenceSource.EXTRA);
		assertThat(savedExtra.status()).isEqualTo(OccurrenceStatus.SCHEDULED);
		assertThat(savedExtra.startAt()).isEqualTo(extra.startAt());
		assertThat(savedExtra.endAt()).isEqualTo(extra.endAt());
		assertThat(savedExtra.attendeesCount()).isEqualTo(1);
		assertThat(find(changed, cancelled).attendeesCount()).isEqualTo(1);
		assertThat(participant.cancelRegistration(id).status()).isEqualTo(CANCELLED);
		assertThat(author.occurrences(id)).allSatisfy(o -> assertThat(o.attendeesCount()).isZero());

		// Заявка даёт право отмечаться только после принятия; исключение освобождает место.
		var requestId = author.createEvent(seriesForm().with("joinMode", "REQUEST")).id();
		var registration = participant.joinEvent(requestId);
		assertThat(registration.status()).isEqualTo(PENDING);
		var requested = participant.occurrences(requestId).getFirst();
		assertThat(assertThatApi(() -> participant.attend(requestId, requested.id())).fails(CONFLICT).detail())
				.contains("ждёт решения");
		assertThat(author.approve(registration.id()).status()).isEqualTo(CONFIRMED);
		assertThat(participant.attend(requestId, requested.id()).attendeesCount()).isEqualTo(1);
		assertThat(author.reject(registration.id(), "Смена состава").status()).isEqualTo(REJECTED);
		assertThat(find(author.occurrences(requestId), requested).attendeesCount()).isZero();
		assertThatApi(() -> participant.attend(requestId, requested.id())).fails(CONFLICT);
	}

	private EventForm seriesForm() {
		return EventForm.free().schedule(schedule(rules(), start.plusWeeks(5)));
	}

	private List<ScheduleRuleRequest> rules() {
		return List.of(rule(start, 20, "FREQ=WEEKLY;BYDAY=TU"),
				rule(start.plusDays(12), 14, "FREQ=WEEKLY;INTERVAL=2;BYDAY=SU"));
	}

	private ScheduleRuleRequest rule(LocalDate first, int hour, String rrule) {
		return new ScheduleRuleRequest(first.atTime(hour, 0), 90, rrule);
	}

	private ScheduleRequest schedule(List<ScheduleRuleRequest> rules, LocalDate end) {
		return new ScheduleRequest(ZONE.getId(), start, end, rules);
	}

	private Instant at(LocalDate day, int hour) {
		return day.atTime(hour, 0).atZone(ZONE).toInstant();
	}

	private List<EventSummaryResponse> feed(Actor actor, EventForm form, LocalDate from, LocalDate to) {
		return actor.feed(Map.of("searchText", form.get("title").toString(),
				"from", from.atStartOfDay(ZONE).toInstant().toString(),
				"to", to.plusDays(1).atStartOfDay(ZONE).toInstant().minusNanos(1).toString()));
	}

	private OccurrenceResponse find(List<OccurrenceResponse> list, OccurrenceResponse original) {
		return list.stream().filter(o -> o.id().equals(original.id())).findFirst().orElseThrow();
	}

	private List<OccurrenceResponse> onDay(List<OccurrenceResponse> list, DayOfWeek day) {
		return list.stream().filter(o -> o.startAt().atZone(ZONE).getDayOfWeek() == day).toList();
	}
}
