package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.EventStatus.*;
import static com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.enums.NotificationType;
import com.hackathon.app.domain.dto.AdminEventResponse;
import com.hackathon.app.domain.enums.EventStatus;
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

/** Сценарий приёмки 6: модерация скрывает мероприятие, сохраняя карточку и записи участников. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class AdminModerationE2ETest {
	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;
	private TestApi api;

	@BeforeEach
	void setUp() {
		api = new TestApi(mvc, json, users, passwords);
	}

	/**
	 * ФЛОУ: администратор снимает встречу с публикации; участник и организатор видят причину и прежнюю запись.
	 * ШАГИ:
	 *   1. Создать FREE, записать участника с CONFIRMED; другим USER найти событие в ленте и поиске.
	 *   2. Снять событие администратором с причиной; проверить ответ и список админки по статусу и названию.
	 *   3. Другим USER перечитать ленту и поиск без события, открыть прямую ссылку и попытаться записаться.
	 *   4. Участником прочитать мои записи, организатором — мои события и список участников.
	 * ПРОВЕРЯЕМ: UNPUBLISHED с причиной, отсутствие в выдаче, canRegister=false и согласованный русский
	 *   registerBlockedReason/409; прежний id записи, CONFIRMED, статус события и причина у обеих сторон.
	 * ПОЧЕМУ ВАЖНО: модерация должна остановить новые записи, сохранив объяснение и историю уже записавшимся.
	 */
	@Test
	void unpublishHidesEventAndBlocksJoiningWithoutLosingConfirmedParticipant() {
		// 1. Встреча опубликована, участник подтверждён.
		var author = api.newUser("author");
		var participant = api.newUser("participant");
		var newcomer = api.newUser("newcomer");
		var admin = api.newAdmin();
		var form = EventForm.free();
		var event = author.createEvent(form);
		var title = form.get("title").toString();
		var joined = participant.joinEvent(event.id());
		assertThat(joined.status()).isEqualTo(CONFIRMED);
		assertPublishedInFeedAndSearch(newcomer, event.id(), title);

		// 2. Модерация сохраняет причину и видна в админке.
		var reason = "Площадка временно закрыта, требуется уточнить место";
		var moderated = admin.unpublishEvent(event.id(), reason);
		assertModerated(moderated, event.id(), UNPUBLISHED, reason);
		assertThat(moderated.participantsCount()).isEqualTo(1);
		assertAdminList(admin, event.id(), title, UNPUBLISHED, reason);

		// 3. Новые записи закрыты, история участника и организатора сохранена.
		assertHiddenAndRegistrationBlocked(newcomer, event.id(), title, UNPUBLISHED, reason,
				"Запись закрыта: мероприятие снято с публикации");
		assertRetainedRegistrationAndOrganizerViews(participant, author, joined.id(), event.id(), UNPUBLISHED, reason);
	}

	/**
	 * ФЛОУ: мягкое удаление скрывает встречу, но сохраняет прямую ссылку, причину и подтверждённого участника.
	 * ШАГИ:
	 *   1. Создать опубликованное событие, записать участника, найти событие другим USER.
	 *   2. Удалить событие администратором с причиной; найти DELETED в списке админки.
	 *   3. Проверить отсутствие в ленте и поиске, карточку DELETED и запрет новой записи с 409.
	 *   4. Перечитать мои записи участника и мои события организатора с DELETED и причиной.
	 * ПРОВЕРЯЕМ: DELETE с JSON-причиной выполняет мягкое удаление, canRegister=false,
	 *   русское объяснение запрета, сохранение CONFIRMED и прежнего идентификатора записи.
	 * ПОЧЕМУ ВАЖНО: физическое удаление лишило бы участника объяснения и истории договорённости о встрече.
	 */
	@Test
	void deletePreservesDirectLinkAndRegistrationsButHidesEventAndBlocksJoining() {
		// 1. До удаления встреча видна и содержит подтверждённую запись.
		var author = api.newUser("author");
		var participant = api.newUser("participant");
		var newcomer = api.newUser("newcomer");
		var admin = api.newAdmin();
		var form = EventForm.free();
		var event = author.createEvent(form);
		var title = form.get("title").toString();
		var joined = participant.joinEvent(event.id());
		assertThat(joined.status()).isEqualTo(CONFIRMED);
		assertPublishedInFeedAndSearch(newcomer, event.id(), title);

		// 2. Удаление мягкое: статус и причина видны в админке.
		var reason = "Мероприятие нарушает правила площадки";
		assertModerated(admin.deleteEvent(event.id(), reason), event.id(), DELETED, reason);
		assertAdminList(admin, event.id(), title, DELETED, reason);

		// 3. Карточка и личные списки сохраняются, выдача и новые записи закрыты.
		assertHiddenAndRegistrationBlocked(newcomer, event.id(), title, DELETED, reason,
				"Запись закрыта: мероприятие удалено");
		assertRetainedRegistrationAndOrganizerViews(participant, author, joined.id(), event.id(), DELETED, reason);
	}

	/**
	 * ФЛОУ: модерация доступна только ADMIN и требует непустую причину существующего мероприятия.
	 * ШАГИ:
	 *   1. Создать событие от USER; USER и ORG пытаются снять и удалить его с валидной причиной — 403.
	 *   2. ADMIN вызывает обе операции без тела, без reason, с пустым и пробельным reason — 400.
	 *   3. Обоими методами передать неизвестный UUID с валидной причиной — 404.
	 *   4. Перечитать карточку, ленту, поиск и админский список: событие всё ещё PUBLISHED, причины нет.
	 * ПРОВЕРЯЕМ: реальные ограничения ролей в Security, обязательность тела и @NotBlank reason,
	 *   404 с русской причиной, отсутствие изменений после всех отвергнутых команд.
	 * ПОЧЕМУ ВАЖНО: организатор и случайный пользователь не должны подменять модератора,
	 *   а необъяснённое снятие не должно скрывать встречу от участников.
	 */
	@Test
	void rolesRequiredReasonAndUnknownIdAreEnforcedWithoutChangingPublishedEvent() {
		// 1. USER и ORG не могут модерировать даже с валидной причиной.
		var user = api.newUser("author");
		var org = api.newOrganization("org");
		var admin = api.newAdmin();
		var form = EventForm.free();
		var event = user.createEvent(form);
		var title = form.get("title").toString();
		for (var forbidden : List.of(user, org)) {
			assertThatApi(() -> forbidden.unpublishEvent(event.id(), "Чужое решение")).fails(FORBIDDEN);
			assertThatApi(() -> forbidden.deleteEvent(event.id(), "Чужое решение")).fails(FORBIDDEN);
		}

		// 2. Обе операции требуют тело и непустую причину существующего события.
		for (var action : List.of("unpublish", "delete")) {
			assertThatApi(() -> moderate(admin, event.id(), action, null)).fails(BAD_REQUEST);
			for (var body : List.of(Map.<String, String>of(), Map.of("reason", ""), Map.of("reason", " \n\t "))) {
				assertThatApi(() -> moderate(admin, event.id(), action, body)).fails(BAD_REQUEST);
			}
			assertThatApi(() -> moderate(admin, UUID.randomUUID(), action, Map.of("reason", "Событие не существует")))
					.fails(NOT_FOUND, "Мероприятие не найдено");
		}

		// 3. Отказы оставляют встречу опубликованной без причины модерации.
		var card = user.openEvent(event.id());
		assertThat(card.status()).isEqualTo(PUBLISHED);
		assertThat(card.moderationReason()).isNull();
		assertPublishedInFeedAndSearch(user, event.id(), title);
		assertThat(admin.adminEvents(title, "PUBLISHED").items()).singleElement().satisfies(item -> {
			assertThat(item.id()).isEqualTo(event.id());
			assertThat(item.status()).isEqualTo(PUBLISHED);
			assertThat(item.moderationReason()).isNull();
		});
	}

	private AdminEventResponse moderate(Actor admin, UUID id, String action, Map<String, String> body) {
		return action.equals("unpublish") ? admin.unpublishEvent(id, body) : admin.deleteEvent(id, body);
	}

	private void assertModerated(AdminEventResponse event, UUID id, EventStatus status, String reason) {
		assertThat(event.id()).isEqualTo(id);
		assertThat(event.status()).isEqualTo(status);
		assertThat(event.moderationReason()).isEqualTo(reason);
		assertThat(event.moderatedAt()).isNotNull();
	}

	private void assertPublishedInFeedAndSearch(Actor viewer, UUID id, String title) {
		assertThat(viewer.feed()).extracting(e -> e.id()).contains(id);
		assertThat(viewer.search(title)).extracting(e -> e.id()).containsExactly(id);
	}

	private void assertHiddenAndRegistrationBlocked(Actor viewer, UUID id, String title, EventStatus status,
			String reason, String blockedReason) {
		assertThat(viewer.feed()).extracting(e -> e.id()).doesNotContain(id);
		assertThat(viewer.search(title)).isEmpty();
		var card = viewer.openEvent(id);
		assertThat(card.id()).isEqualTo(id);
		assertThat(card.status()).isEqualTo(status);
		assertThat(card.moderationReason()).isEqualTo(reason);
		assertThat(card.viewer().canRegister()).isFalse();
		assertThat(card.viewer().registerBlockedReason()).isEqualTo(blockedReason);
		assertThatApi(() -> viewer.joinEvent(id)).fails(CONFLICT, blockedReason);
		assertThat(viewer.myRegistrations()).isEmpty();
	}

	private void assertRetainedRegistrationAndOrganizerViews(Actor participant, Actor author, UUID registrationId,
			UUID eventId, EventStatus status, String reason) {
		assertThat(participant.myRegistrations()).singleElement().satisfies(registration -> {
			assertThat(registration.id()).isEqualTo(registrationId);
			assertThat(registration.status()).isEqualTo(CONFIRMED);
			assertThat(registration.event().id()).isEqualTo(eventId);
			assertThat(registration.event().status()).isEqualTo(status);
			assertThat(registration.event().moderationReason()).isEqualTo(reason);
		});
		assertThat(author.myEvents()).singleElement().satisfies(event -> {
			assertThat(event.id()).isEqualTo(eventId);
			assertThat(event.status()).isEqualTo(status);
			assertThat(event.moderationReason()).isEqualTo(reason);
			assertThat(event.participantsCount()).isEqualTo(1);
		});
		assertThat(author.participants(eventId)).singleElement().satisfies(registration -> {
			assertThat(registration.id()).isEqualTo(registrationId);
			assertThat(registration.status()).isEqualTo(CONFIRMED);
		});
	}

	private void assertAdminList(Actor admin, UUID id, String title, EventStatus status, String reason) {
		var page = admin.adminEvents(title, status.name());
		assertThat(page.totalElements()).isEqualTo(1);
		assertThat(page.items()).singleElement().satisfies(event -> {
			assertThat(event.id()).isEqualTo(id);
			assertThat(event.status()).isEqualTo(status);
			assertThat(event.moderationReason()).isEqualTo(reason);
		});
	}

	/**
	 * ФЛОУ: админ ошибочно снял мероприятие и возвращает его в публикацию.
	 * ШАГИ: 1. Создать событие с участником и снять его. 2. Вернуть в публикацию. 3. Проверить ленту, запись
	 *   и уведомление участнику. 4. Повторное восстановление и восстановление удалённого.
	 * ПРОВЕРЯЕМ: статус PUBLISHED без причины, событие в поиске, новая запись проходит, EVENT_RESTORED у участника,
	 *   409 «Мероприятие и так опубликовано» и «Удалённое мероприятие восстановить нельзя».
	 * ПОЧЕМУ ВАЖНО: ошибку модерации нужно исправлять без пересоздания события и потери записей.
	 */
	@Test
	void restoreReturnsUnpublishedEventButNotDeletedOne() {
		var author = api.newUser("author");
		var participant = api.newUser("participant");
		var admin = api.newAdmin();
		var title = uniqueName("Йога ");
		var id = author.createEvent(EventForm.free().title(title)).id();
		participant.joinEvent(id);
		admin.unpublishEvent(id, "Проверяем жалобу");

		var restored = admin.restoreEvent(id);
		assertThat(restored.status()).isEqualTo(PUBLISHED);
		assertThat(restored.moderationReason()).isNull();
		var newcomer = api.newUser("newcomer");
		assertThat(newcomer.search(title)).extracting(e -> e.id()).containsExactly(id);
		assertThat(newcomer.joinEvent(id).status()).isEqualTo(CONFIRMED);
		assertThat(participant.notifications().items()).extracting(n -> n.type()).contains(NotificationType.EVENT_RESTORED);

		assertThatApi(() -> admin.restoreEvent(id)).fails(CONFLICT, "Мероприятие и так опубликовано");
		admin.deleteEvent(id, "Дубль");
		assertThatApi(() -> admin.restoreEvent(id)).fails(CONFLICT, "Удалённое мероприятие восстановить нельзя");
	}
}
