package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.RegistrationStatus.*;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import com.hackathon.app.domain.dto.MyRegistrationResponse;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.e2e.support.Actor;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RegistrationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/** Сценарии приёмки 3 и 4: свободная запись, заявки, права и ограничение мест. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class RegistrationE2ETest {
	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;
	@Autowired EventRepository events;
	@Autowired RegistrationRepository registrations;
	private TestApi api;

	@BeforeEach
	void setUp() {
		api = new TestApi(mvc, json, users, passwords);
	}

	/**
	 * ФЛОУ: свободная запись сразу даёт место, отмена освобождает его, повторная запись использует прежнюю строку.
	 * ШАГИ:
	 *   1. Войти автором и участником, создать FREE; попытаться записать автора — 409.
	 *   2. Записать участника, сверить CONFIRMED, список организатора, участников карточки и мои записи.
	 *   3. Повторить запись без отмены — 409; отменить и проверить исчезновение участника.
	 *   4. Записаться снова и сравнить id, createdAt и число строк Registration в БД.
	 * ПРОВЕРЯЕМ: немедленное подтверждение у обеих сторон, запрет самозаписи, отсутствие дубля и восстановление места.
	 * ПОЧЕМУ ВАЖНО: двойной клик не должен занимать два места, а отмена не должна лишать возможности вернуться.
	 */
	@Test
	void freeRegistrationIsVisibleAndRejoinReusesCancelledRow() {
		// 1. Организатор не записывается на своё событие, участник сразу подтверждён.
		var author = api.newUser("author");
		var participant = api.newUser("participant");
		var id = author.createEvent(EventForm.free()).id();
		assertThatApi(() -> author.joinEvent(id)).fails(CONFLICT, "Организатор не может записаться на своё мероприятие");
		var joined = participant.joinEvent(id);
		assertThat(joined.status()).isEqualTo(CONFIRMED);
		assertThat(author.participants(id)).singleElement().satisfies(row -> {
			assertThat(row.id()).isEqualTo(joined.id());
			assertThat(row.status()).isEqualTo(CONFIRMED);
			assertThat(row.participant().username()).isEqualTo(participant.username());
		});
		var card = author.openEvent(id);
		assertThat(card.participantsCount()).isEqualTo(1);
		assertThat(card.participants()).extracting(p -> p.username()).containsExactly(participant.username());
		assertMine(participant, joined.id(), CONFIRMED);

		// 2. Двойная запись запрещена, отмена освобождает место.
		assertThatApi(() -> participant.joinEvent(id)).fails(CONFLICT, "Вы уже записаны на это мероприятие");
		var cancelled = participant.cancelRegistration(id);
		assertThat(cancelled.id()).isEqualTo(joined.id());
		assertThat(cancelled.status()).isEqualTo(CANCELLED);
		var empty = author.openEvent(id);
		assertThat(empty.participantsCount()).isZero();
		assertThat(empty.participants()).isEmpty();

		// 3. Возвращение переиспользует строку с прежними id и createdAt.
		var rejoined = participant.joinEvent(id);
		assertThat(rejoined.id()).isEqualTo(joined.id());
		assertThat(rejoined.status()).isEqualTo(CONFIRMED);
		assertThat(rejoined.createdAt()).isEqualTo(joined.createdAt());
		assertThat(registrations.findByEventIdOrderByCreatedAt(id)).singleElement().satisfies(saved -> {
			assertThat(saved.getId()).isEqualTo(joined.id());
			assertThat(saved.getStatus()).isEqualTo(CONFIRMED);
		});
		var restored = participant.openEvent(id);
		assertThat(restored.participantsCount()).isEqualTo(1);
		assertThat(restored.viewer().registrationStatus()).isEqualTo(CONFIRMED);
	}

	/**
	 * ФЛОУ: приватная онлайн-встреча принимает заявки; решения доступны автору и соорганизатору.
	 * ШАГИ:
	 *   1. Создать REQUEST с приватными полями; проверить их сокрытие до заявки и при PENDING.
	 *   2. Запретить approve и reject чужому USER и ADMIN; автор принимает первую заявку.
	 *   3. Сверить CONFIRMED в моих записях и списке автора; карточка раскрывает приватные поля.
	 *   4. Автор отклоняет второго человека с причиной; тот видит REJECTED и скрытые детали.
	 *   5. Автор добавляет соорганизатора, который принимает третью заявку; проверить viewer и обе стороны решения.
	 *   6. Запретить изменение состава не-автору и добавление ADMIN; перечитать неизменившийся состав.
	 * ПРОВЕРЯЕМ: точные причины отказов, сохранённые решения, права viewer, приватность и полномочия соорганизатора.
	 * ПОЧЕМУ ВАЖНО: заявки должны иметь согласованные состояния у обеих сторон, а ссылка встречи — оставаться закрытой.
	 */
	@Test
	void requestDecisionsProtectPrivateDetailsAndRespectOrganizerPermissions() {
		// 1. До заявки и в PENDING приватные поля скрыты.
		var author = api.newUser("author");
		var first = api.newUser("first");
		var second = api.newUser("second");
		var third = api.newUser("third");
		var co = api.newUser("coorganizer");
		var admin = api.newAdmin();
		var id = author.createEvent(EventForm.byRequest().online("https://meet.example.com/private")
				.privateDetails("Код входа: 12345")).id();
		assertPrivateCard(first, id, null, false);
		var firstRequest = first.joinEvent(id);
		assertThat(firstRequest.status()).isEqualTo(PENDING);
		assertMine(first, firstRequest.id(), PENDING);
		assertPrivateCard(first, id, PENDING, false);

		// 2. Чужой USER и ADMIN не решают заявку; автор принимает её.
		for (var outsider : List.of(third, admin)) {
			assertThatApi(() -> outsider.approve(firstRequest.id())).fails(FORBIDDEN, "Решение по заявке принимает только организатор");
			assertThatApi(() -> outsider.reject(firstRequest.id(), "Чужое решение"))
					.fails(FORBIDDEN, "Решение по заявке принимает только организатор");
		}
		assertMine(first, firstRequest.id(), PENDING);
		assertThat(author.approve(firstRequest.id()).status()).isEqualTo(CONFIRMED);
		assertMine(first, firstRequest.id(), CONFIRMED);
		assertPrivateCard(first, id, CONFIRMED, true);
		var accepted = author.participants(id).getFirst();
		assertThat(accepted.id()).isEqualTo(firstRequest.id());
		assertThat(accepted.status()).isEqualTo(CONFIRMED);

		// 3. Отказ и его причина видны обеим сторонам, детали остаются закрытыми.
		var secondRequest = second.joinEvent(id);
		assertThat(secondRequest.status()).isEqualTo(PENDING);
		var reason = "Для этой тренировки нужен опыт";
		var rejected = author.reject(secondRequest.id(), reason);
		assertThat(rejected.status()).isEqualTo(REJECTED);
		assertThat(rejected.decisionReason()).isEqualTo(reason);
		assertThat(assertMine(second, secondRequest.id(), REJECTED).decisionReason()).isEqualTo(reason);
		assertPrivateCard(second, id, REJECTED, false);
		assertThat(author.participants(id, "REJECTED")).singleElement().satisfies(row -> {
			assertThat(row.id()).isEqualTo(secondRequest.id());
			assertThat(row.decisionReason()).isEqualTo(reason);
		});

		// 4. Соорганизатор принимает третью заявку от своего имени.
		var organizers = author.addOrganizer(id, co.username());
		assertThat(organizers).hasSize(2);
		assertThat(organizers.get(1).user().username()).isEqualTo(co.username());
		assertThat(organizers.get(1).invited()).isTrue();
		co.acceptOrganizerInvite(id);
		var coId = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(co.username(), co.username()).orElseThrow().getId();
		var thirdRequest = third.joinEvent(id);
		assertThat(thirdRequest.status()).isEqualTo(PENDING);
		var approvedByCo = co.approve(thirdRequest.id());
		assertThat(approvedByCo.status()).isEqualTo(CONFIRMED);
		assertThat(approvedByCo.decidedById()).isEqualTo(coId);
		assertMine(third, thirdRequest.id(), CONFIRMED);
		assertPrivateCard(third, id, CONFIRMED, true);
		assertThat(co.participants(id, "CONFIRMED")).hasSize(2).extracting(r -> r.id()).contains(thirdRequest.id());

		// 5. Состав меняет только автор; ADMIN нельзя добавить даже автору.
		var adminName = admin.me().username();
		for (var outsider : List.of(co, third)) {
			assertThatApi(() -> outsider.addOrganizer(id, adminName)).fails(FORBIDDEN, "Состав организаторов меняет только автор мероприятия");
		}
		assertThatApi(() -> third.removeOrganizer(id, coId)).fails(FORBIDDEN, "Состав организаторов меняет только автор мероприятия");
		assertThatApi(() -> author.addOrganizer(id, adminName)).fails(CONFLICT, "Администратора нельзя сделать организатором");
		var card = co.openEvent(id);
		assertThat(card.organizers()).hasSize(2);
		assertThat(card.viewer().isOrganizer()).isTrue();
		assertThat(card.viewer().canManage()).isTrue();
		assertThat(card.viewer().canManageOrganizers()).isFalse();
	}

	/**
	 * ФЛОУ: заполненная и уже начавшаяся встречи не переполняются; одобрение тоже учитывает capacity.
	 * ШАГИ:
	 *   1. Создать FREE на одно место, занять его; второй USER попадает в лист ожидания и места не занимает.
	 *   2. Создать REQUEST на одно место, подать две заявки, подтвердить одну, получить отказ для второй.
	 *   3. Создать будущее событие через API и перенести startAt в прошлое через EventRepository.
	 *   4. Проверить запрет записи и соответствующие viewer.canRegister/registerBlockedReason.
	 * ПРОВЕРЯЕМ: WAITLISTED вместо места, 409 и точные причины, один CONFIRMED и оставшийся PENDING,
	 *   отсутствие поздней записи в БД.
	 * ПОЧЕМУ ВАЖНО: API не должен переполнять встречу ни прямой записью, ни решением организатора, ни после начала.
	 */
	@Test
	void capacityAndStartedEventBlockRegistrationAndApproval() {
		// 1. Свободная запись учитывает занятое последнее место: второй встаёт в лист ожидания, места не занимает.
		var author = api.newUser("author");
		var first = api.newUser("first");
		var second = api.newUser("second");
		var freeId = author.createEvent(EventForm.free().capacity(1)).id();
		assertThat(first.joinEvent(freeId).status()).isEqualTo(CONFIRMED);
		assertThat(second.joinEvent(freeId).status()).isEqualTo(WAITLISTED);
		assertThat(registrations.countByEventIdAndStatus(freeId, CONFIRMED)).isEqualTo(1);

		// 2. Одобрение тоже ограничено capacity; вторая заявка остаётся PENDING.
		var requestId = author.createEvent(EventForm.byRequest().capacity(1)).id();
		var firstId = first.joinEvent(requestId).id();
		var secondId = second.joinEvent(requestId).id();
		assertThat(author.approve(firstId).status()).isEqualTo(CONFIRMED);
		assertThatApi(() -> author.approve(secondId)).fails(CONFLICT, "Мест нет");
		assertThat(registrations.countByEventIdAndStatus(requestId, CONFIRMED)).isEqualTo(1);
		assertThat(registrations.findById(secondId).orElseThrow().getStatus()).isEqualTo(PENDING);

		// 3. После начала сервер не создаёт запись и объясняет запрет в viewer.
		var pastId = author.createEvent(EventForm.free()).id();
		var past = events.findById(pastId).orElseThrow();
		past.setStartAt(Instant.now().minusSeconds(60));
		events.saveAndFlush(past);
		var reason = "Мероприятие уже началось, запись закрыта";
		assertThatApi(() -> second.joinEvent(pastId)).fails(CONFLICT, reason);
		assertRegistrationBlocked(second, pastId, reason);
		assertThat(registrations.findByEventIdOrderByCreatedAt(pastId)).isEmpty();
	}

	/**
	 * ФЛОУ: несколько людей одновременно пытаются занять последние места свободной встречи.
	 * ШАГИ:
	 *   1. Через API подготовить автора, четырёх участников и FREE с capacity = 2.
	 *   2. Запустить четыре потока, дождаться их готовности и одновременно открыть барьер старта.
	 *   3. Собрать ответы с ограничением времени; сверить два CONFIRMED и два WAITLISTED (лист ожидания).
	 *   4. Перечитать Registration из БД и участников карточки после завершения всех транзакций.
	 * ПРОВЕРЯЕМ: ровно capacity строк CONFIRMED, остальные в листе ожидания, согласованный счётчик карточки.
	 * ПОЧЕМУ ВАЖНО: последовательные запросы не обнаруживают потерю блокировки, позволяющую переполнить встречу.
	 */
	@Test
	void parallelRegistrationsConfirmExactlyCapacityParticipants() {
		// 1. Четыре участника претендуют на два места.
		int capacity = 2;
		int attempts = 4;
		var author = api.newUser("author");
		var racers = new ArrayList<Actor>();
		for (int i = 0; i < attempts; i++) {
			racers.add(api.newUser("racer"));
		}
		var id = author.createEvent(EventForm.free().capacity(capacity)).id();

		// 2. Барьер запускает запросы одновременно, каждый ответ проверяется полностью.
		var ready = new CountDownLatch(attempts);
		var start = new CountDownLatch(1);
		var pool = Executors.newFixedThreadPool(attempts);
		var futures = new ArrayList<Future<RegistrationStatus>>();
		try {
			for (var racer : racers) {
				futures.add(pool.submit(() -> joinAtBarrier(racer, id, ready, start)));
			}
			assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
			start.countDown();
			var statuses = new ArrayList<RegistrationStatus>();
			for (var future : futures) {
				statuses.add(future.get(10, TimeUnit.SECONDS));
			}
			assertThat(statuses).containsExactlyInAnyOrder(CONFIRMED, CONFIRMED, WAITLISTED, WAITLISTED);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new AssertionError("Ожидание параллельной записи прервано", e);
		} catch (java.util.concurrent.ExecutionException | java.util.concurrent.TimeoutException e) {
			throw new AssertionError("Параллельная запись не завершилась успешно", e);
		} finally {
			start.countDown();
			pool.shutdownNow();
			try {
				assertThat(pool.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
				throw new AssertionError("Завершение потоков прервано", e);
			}
		}

		// 3. В БД ровно capacity подтверждённых, остальные ждут; счётчик и участники карточки согласованы.
		assertThat(registrations.countByEventIdAndStatus(id, CONFIRMED)).isEqualTo(capacity);
		assertThat(registrations.countByEventIdAndStatus(id, WAITLISTED)).isEqualTo(attempts - capacity);
		var card = author.openEvent(id);
		assertThat(card.participantsCount()).isEqualTo(capacity);
		assertThat(card.participants()).hasSize(capacity);
	}

	private RegistrationStatus joinAtBarrier(Actor racer, UUID eventId, CountDownLatch ready, CountDownLatch start) {
		ready.countDown();
		try {
			assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new AssertionError("Поток записи прерван", e);
		}
		return racer.joinEvent(eventId).status();
	}

	private MyRegistrationResponse assertMine(Actor participant, UUID registrationId, RegistrationStatus status) {
		var mine = participant.myRegistrations().getFirst();
		assertThat(mine.id()).isEqualTo(registrationId);
		assertThat(mine.status()).isEqualTo(status);
		return mine;
	}

	private void assertRegistrationBlocked(Actor participant, UUID id, String reason) {
		var viewer = participant.openEvent(id).viewer();
		assertThat(viewer.canRegister()).isFalse();
		assertThat(viewer.registerBlockedReason()).isEqualTo(reason);
	}

	private void assertPrivateCard(Actor participant, UUID id, RegistrationStatus status, boolean visible) {
		var card = participant.openEvent(id);
		assertThat(card.viewer().registrationStatus()).isEqualTo(status);
		assertThat(card.viewer().canSeePrivateDetails()).isEqualTo(visible);
		assertThat(card.privateDetails()).isEqualTo(visible ? "Код входа: 12345" : null);
		assertThat(card.onlineUrl()).isEqualTo(visible ? "https://meet.example.com/private" : null);
	}

	/**
	 * ФЛОУ: на полное свободное мероприятие встают в лист ожидания и проходят в участники по очереди.
	 * ШАГИ:
	 *   1. FREE на одно место: первый CONFIRMED, второй и третий — WAITLISTED; viewer показывает места в очереди.
	 *   2. Первый отменяет запись — второй автоматически участник и получает уведомление; третий теперь первый в очереди.
	 *   3. Автор увеличивает лимит мест — третий тоже проходит.
	 *   4. Админ и аккаунт организации не записываются участниками.
	 * ПРОВЕРЯЕМ: joinAs = WAITLISTED у нового человека при полной встрече, waitlistPosition 1 и 2, продвижение в
	 *   порядке очереди, «Освободилось место — вы записаны», число подтверждённых не больше лимита; 409 для ролей.
	 * ПОЧЕМУ ВАЖНО: ТЗ называет лист ожидания: освободившееся место не должно пропадать, а люди — уходить ни с чем.
	 */
	@Test
	void waitlistPromotesPeopleInQueueOrderWhenSeatsFreeUp() {
		// 1. Встреча заполнена — следующие встают в очередь.
		var author = api.newUser("author");
		var first = api.newUser("first");
		var second = api.newUser("second");
		var third = api.newUser("third");
		var form = EventForm.free().capacity(1);
		var id = author.createEvent(form).id();
		first.joinEvent(id);
		assertThat(second.openEvent(id).viewer().joinAs()).isEqualTo(WAITLISTED);
		assertThat(second.joinEvent(id).status()).isEqualTo(WAITLISTED);
		assertThat(third.joinEvent(id).status()).isEqualTo(WAITLISTED);
		assertThat(second.openEvent(id).viewer().waitlistPosition()).isEqualTo(1);
		assertThat(third.openEvent(id).viewer().waitlistPosition()).isEqualTo(2);
		assertThat(third.myRegistration(id).waitlistPosition()).isEqualTo(2);

		// 2. Освободилось место — проходит первый в очереди.
		first.cancelRegistration(id);
		assertThat(second.myRegistration(id).status()).isEqualTo(CONFIRMED);
		assertThat(second.notifications().items()).extracting(n -> n.title()).contains("Освободилось место — вы записаны");
		assertThat(third.openEvent(id).viewer().waitlistPosition()).isEqualTo(1);
		assertThat(registrations.countByEventIdAndStatus(id, CONFIRMED)).isEqualTo(1);

		// 3. Больше мест — очередь продвигается сама.
		author.updateEvent(id, form.capacity(3));
		assertThat(third.myRegistration(id).status()).isEqualTo(CONFIRMED);

		// 4. Участником записывается только человек.
		assertThatApi(() -> api.newAdmin().joinEvent(id)).fails(CONFLICT, "Администратор не записывается на мероприятия");
		assertThatApi(() -> api.newOrganization("org").joinEvent(id)).fails(CONFLICT, "Аккаунт организации не записывается участником");
	}
}
