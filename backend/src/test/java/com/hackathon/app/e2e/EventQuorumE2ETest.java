package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.RegistrationStatus.*;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import com.hackathon.app.domain.dto.OccurrenceResponse;
import com.hackathon.app.domain.dto.ScheduleRequest;
import com.hackathon.app.domain.dto.ScheduleRuleRequest;
import com.hackathon.app.domain.enums.QuorumStatus;
import com.hackathon.app.domain.enums.OccurrenceStatus;
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

/** Сквозные сценарии кворума занятий и отмены разового мероприятия организатором. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class EventQuorumE2ETest {
	private static final ZoneId ZONE = ZoneId.of("Asia/Krasnoyarsk");
	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;
	private static final String CANCELLED_REGISTRATION = "Запись закрыта: организатор отменил мероприятие";
	private TestApi api;
	private LocalDate start;

	@BeforeEach
	void setUp() {
		api = new TestApi(mvc, json, users, passwords);
		start = LocalDate.now(ZONE).plusWeeks(2).with(TemporalAdjusters.nextOrSame(DayOfWeek.TUESDAY));
	}

	/**
	 * ФЛОУ: участники набирают кворум разового события, а организатор подтверждает его ниже порога.
	 * ШАГИ:
	 *   1. Создать FREE-событие с пятью местами и кворумом два; открыть карточку без записей.
	 *   2. Последовательно записать двух людей и проверить достижение кворума в карточке и ленте.
	 *   3. Второй выходит: кворум снова собирается; организатор подтверждает и повторяет команду.
	 *   4. Запретить подтверждение участнику; оставшийся участник выходит, подтверждение сохраняется.
	 *   5. Отклонить форму с кворумом выше capacity; создать событие без кворума и запретить подтверждение.
	 * ПРОВЕРЯЕМ: minParticipants, required/count/status/takesPlace, переходы GATHERING/REACHED/CONFIRMED,
	 *   права viewer, идемпотентность подтверждения, HTTP 400/403/409 и отсутствие кворума без настройки.
	 * ПОЧЕМУ ВАЖНО: участники должны видеть актуальный набор, а обещание организатора провести встречу
	 *   не должно исчезать из-за последующих отказов или быть доступным постороннему.
	 */
	@Test
	void singleQuorumTracksRegistrationsAndOrganizerConfirmationSurvivesLeaving() {
		var author = api.newUser("quorumAuthor");
		var first = api.newUser("quorumFirst");
		var second = api.newUser("quorumSecond");
		var form = quorumForm();
		var id = author.createEvent(form).id();
		var card = author.openEvent(id);
		assertThat(card.minParticipants()).isEqualTo(2);
		var occurrence = card.singleOccurrence();
		assertThat(occurrence.status()).isEqualTo(OccurrenceStatus.SCHEDULED);
		assertThat(occurrence.viewer().canCancel()).isTrue();
		assertThat(occurrence.viewer().canReschedule()).isFalse();
		assertThat(occurrence.viewer().canConfirm()).isTrue();
		quorum(occurrence, 0, QuorumStatus.GATHERING, false);

		// Кворум разового события считается по подтверждённым записям.
		assertThat(first.joinEvent(id).status()).isEqualTo(CONFIRMED);
		quorum(first.openEvent(id).singleOccurrence(), 1, QuorumStatus.GATHERING, false);
		assertThat(second.joinEvent(id).status()).isEqualTo(CONFIRMED);
		quorum(first.openEvent(id).singleOccurrence(), 2, QuorumStatus.REACHED, true);
		assertThat(first.search(form.get("title").toString())).singleElement().satisfies(event -> {
			assertThat(event.id()).isEqualTo(id);
			assertThat(event.minParticipants()).isEqualTo(2);
			assertThat(event.quorumStatus()).isEqualTo(QuorumStatus.REACHED);
			assertThat(event.cancelledByOrganizer()).isFalse();
		});
		assertThat(second.cancelRegistration(id).status()).isEqualTo(CANCELLED);
		quorum(author.openEvent(id).singleOccurrence(), 1, QuorumStatus.GATHERING, false);

		// Ручное подтверждение не зависит от порога и не снимается при выходе людей.
		var confirmed = author.confirmOccurrence(id, occurrence.id());
		assertThat(confirmed.viewer().canConfirm()).isFalse();
		quorum(confirmed, 1, QuorumStatus.CONFIRMED, true);
		quorum(author.confirmOccurrence(id, occurrence.id()), 1, QuorumStatus.CONFIRMED, true);
		assertThatApi(() -> first.confirmOccurrence(id, occurrence.id())).fails(FORBIDDEN);
		assertThat(first.cancelRegistration(id).status()).isEqualTo(CANCELLED);
		var afterLeaving = author.openEvent(id).singleOccurrence();
		assertThat(afterLeaving.viewer().canConfirm()).isFalse();
		quorum(afterLeaving, 0, QuorumStatus.CONFIRMED, true);

		// Невалидный порог отклоняется; без настройки кворума подтверждать нечего.
		assertThatApi(() -> author.createEvent(quorumForm().minParticipants(6)))
				.fails(BAD_REQUEST, "Кворум не может быть больше лимита мест");
		var noQuorumId = author.createEvent(EventForm.free()).id();
		var noQuorumCard = author.openEvent(noQuorumId);
		assertThat(noQuorumCard.minParticipants()).isNull();
		var noQuorum = noQuorumCard.singleOccurrence();
		assertThat(noQuorum.quorum()).isNull();
		assertThat(noQuorum.viewer().canConfirm()).isFalse();
		assertThatApi(() -> author.confirmOccurrence(noQuorumId, noQuorum.id())).fails(CONFLICT);
	}

	/**
	 * ФЛОУ: участники серии выбирают разные даты, и кворум с подтверждением относятся только к выбранному занятию.
	 * ШАГИ:
	 *   1. Создать серию с кворумом два и вступить в неё двум пользователям без отметок на даты.
	 *   2. Оба отмечаются на первое занятие, только первый — на второе; третье остаётся пустым.
	 *   3. Подтвердить второе ниже порога; перечитать занятия и ближайший кворум в ленте.
	 *   4. Снять отметку со второго занятия: подтверждение остаётся; отменить третье и запретить подтверждение.
	 *   5. Отменить также ранее подтверждённое второе занятие и запретить повторное подтверждение отменённого.
	 * ПРОВЕРЯЕМ: singleOccurrence=null у серии, нулевой кворум после вступления, независимые счётчики 2/1/0,
	 *   REACHED только у первого, CONFIRMED только у второго и HTTP 409 для отменённых занятий,
	 *   включая ранее подтверждённое организатором.
	 * ПОЧЕМУ ВАЖНО: вступление в серию не означает посещение каждой даты, а решение провести одно занятие
	 *   не должно подтверждать остальные или разрешать проведение отменённого.
	 */
	@Test
	void seriesQuorumCountsAttendanceAndConfirmationAppliesOnlyToOneOccurrence() {
		var author = api.newUser("quorumSeriesAuthor");
		var first = api.newUser("quorumSeriesFirst");
		var second = api.newUser("quorumSeriesSecond");
		var form = seriesForm();
		var id = author.createEvent(form).id();
		var card = author.openEvent(id);
		assertThat(card.minParticipants()).isEqualTo(2);
		assertThat(card.singleOccurrence()).isNull();
		for (var participant : List.of(first, second)) {
			assertThat(participant.joinEvent(id).status()).isEqualTo(CONFIRMED);
		}
		var dates = author.occurrences(id);
		assertThat(dates).hasSize(3);
		dates.forEach(o -> quorum(o, 0, QuorumStatus.GATHERING, false));
		var reached = dates.getFirst();
		var confirmed = dates.get(1);
		var cancelled = dates.get(2);

		// Кворум каждой даты независим от вступления в серию и других дат.
		for (var participant : List.of(first, second)) {
			participant.attend(id, reached.id());
		}
		quorum(first.attend(id, confirmed.id()), 1, QuorumStatus.GATHERING, false);
		quorum(author.confirmOccurrence(id, confirmed.id()), 1, QuorumStatus.CONFIRMED, true);
		var saved = author.occurrences(id);
		quorum(find(saved, reached), 2, QuorumStatus.REACHED, true);
		quorum(find(saved, confirmed), 1, QuorumStatus.CONFIRMED, true);
		quorum(find(saved, cancelled), 0, QuorumStatus.GATHERING, false);
		assertThat(first.search(form.get("title").toString())).singleElement().satisfies(event -> {
			assertThat(event.id()).isEqualTo(id);
			assertThat(event.quorumStatus()).isEqualTo(QuorumStatus.REACHED);
		});
		quorum(first.unattend(id, confirmed.id()), 0, QuorumStatus.CONFIRMED, true);

		// Отмена запрещает подтверждение, даже если организатор уже обещал провести занятие.
		assertThat(author.cancelOccurrence(id, cancelled.id(), "Зал закрыт").status())
				.isEqualTo(OccurrenceStatus.CANCELLED);
		assertThatApi(() -> author.confirmOccurrence(id, cancelled.id())).fails(CONFLICT, "Занятие отменено");
		quorum(find(author.occurrences(id), reached), 2, QuorumStatus.REACHED, true);
		assertThat(author.cancelOccurrence(id, confirmed.id(), "Занятие всё же отменено").status())
				.isEqualTo(OccurrenceStatus.CANCELLED);
		assertThatApi(() -> author.confirmOccurrence(id, confirmed.id())).fails(CONFLICT, "Занятие отменено");
	}

	/**
	 * ФЛОУ: организатор отменяет разовое REQUEST-событие, сохраняя видимость отмены для уже принятого участника.
	 * ШАГИ:
	 *   1. Создать событие, принять первую заявку и оставить вторую ожидающей решения.
	 *   2. Проверить наличие в ленте, запретить участнику отменять и организатору переносить разовое занятие.
	 *   3. Организатор отменяет с причиной; перечитать карточку и убедиться, что событие исчезло из ленты.
	 *   4. Запретить новую запись и одобрение ожидающей заявки; перечитать обе записи пользователей.
	 * ПРОВЕРЯЕМ: CANCELLED и cancelReason единственного занятия, запрет записи с точным пояснением,
	 *   HTTP 403/409, cancelledByOrganizer=true в моих записях, сохранение CONFIRMED и PENDING.
	 * ПОЧЕМУ ВАЖНО: отменённую встречу нельзя продолжать наполнять участниками, но уже записавшиеся
	 *   должны видеть отмену, а ожидающая заявка не должна незаметно превращаться в подтверждённую.
	 */
	@Test
	void cancellingSingleEventClosesRegistrationAndPreservesExistingParticipants() {
		var author = api.newUser("cancelSingleAuthor");
		var confirmed = api.newUser("cancelConfirmed");
		var pending = api.newUser("cancelPending");
		var newcomer = api.newUser("cancelSingleNew");
		var form = EventForm.byRequest().capacity(5).minParticipants(2);
		var id = author.createEvent(form).id();
		var confirmedRegistration = confirmed.joinEvent(id);
		assertThat(confirmedRegistration.status()).isEqualTo(PENDING);
		assertThat(author.approve(confirmedRegistration.id()).status()).isEqualTo(CONFIRMED);
		var pendingRegistration = pending.joinEvent(id);
		assertThat(pendingRegistration.status()).isEqualTo(PENDING);
		var occurrence = author.openEvent(id).singleOccurrence();
		quorum(occurrence, 1, QuorumStatus.GATHERING, false); // ожидающая заявка не входит в кворум
		var title = form.get("title").toString();
		assertThat(newcomer.search(title)).hasSize(1);
		assertThatApi(() -> confirmed.cancelOccurrence(id, occurrence.id(), "Чужая отмена")).fails(FORBIDDEN);
		assertThatApi(() -> author.rescheduleOccurrence(id, occurrence.id(), Instant.now().plusSeconds(259200)))
				.fails(CONFLICT);

		// Отмена закрывает запись и скрывает событие, сохраняя объяснение по прямой ссылке.
		var reason = "Площадка закрыта на ремонт";
		var cancelled = author.cancelOccurrence(id, occurrence.id(), reason);
		assertThat(cancelled.status()).isEqualTo(OccurrenceStatus.CANCELLED);
		assertThat(cancelled.cancelReason()).isEqualTo(reason);
		var card = newcomer.openEvent(id);
		assertThat(card.singleOccurrence().id()).isEqualTo(occurrence.id());
		assertThat(card.singleOccurrence().status()).isEqualTo(OccurrenceStatus.CANCELLED);
		assertThat(card.singleOccurrence().cancelReason()).isEqualTo(reason);
		assertThat(card.viewer().canRegister()).isFalse();
		assertThat(card.viewer().registerBlockedReason()).isEqualTo(CANCELLED_REGISTRATION);
		var viewer = author.openEvent(id).singleOccurrence().viewer();
		assertThat(viewer.canCancel()).isFalse();
		assertThat(viewer.canReschedule()).isFalse();
		assertThat(viewer.canConfirm()).isFalse();
		assertThat(newcomer.search(title)).isEmpty();
		assertThatApi(() -> newcomer.joinEvent(id)).fails(CONFLICT, CANCELLED_REGISTRATION);
		assertThatApi(() -> author.approve(pendingRegistration.id())).fails(CONFLICT);

		// Прежние записи и их статусы сохранены, принятый участник видит отмену.
		assertThat(confirmed.myRegistrations()).singleElement().satisfies(registration -> {
			assertThat(registration.id()).isEqualTo(confirmedRegistration.id());
			assertThat(registration.status()).isEqualTo(CONFIRMED);
			assertThat(registration.event().id()).isEqualTo(id);
			assertThat(registration.event().cancelledByOrganizer()).isTrue();
		});
		assertThat(pending.myRegistrations()).singleElement().satisfies(registration -> {
			assertThat(registration.id()).isEqualTo(pendingRegistration.id());
			assertThat(registration.status()).isEqualTo(PENDING);
		});
	}

	private EventForm quorumForm() {
		return EventForm.free().capacity(5).minParticipants(2);
	}

	private EventForm seriesForm() {
		return quorumForm().schedule(new ScheduleRequest(ZONE.getId(), start, start.plusWeeks(2), List.of(
				new ScheduleRuleRequest(start.atTime(20, 0), 90, "FREQ=WEEKLY;BYDAY=TU"))));
	}

	private OccurrenceResponse find(List<OccurrenceResponse> list, OccurrenceResponse original) {
		return list.stream().filter(o -> o.id().equals(original.id())).findFirst().orElseThrow();
	}

	private void quorum(OccurrenceResponse occurrence, int count, QuorumStatus status, boolean takesPlace) {
		var quorum = occurrence.quorum();
		assertThat(quorum).isNotNull();
		assertThat(quorum.required()).isEqualTo(2);
		assertThat(quorum.count()).isEqualTo(count);
		assertThat(quorum.status()).isEqualTo(status);
		assertThat(quorum.takesPlace()).isEqualTo(takesPlace);
	}
}
