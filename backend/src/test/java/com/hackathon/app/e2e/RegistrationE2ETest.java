package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.E2eSupport.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import com.hackathon.app.domain.enums.AccountType;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.e2e.support.E2eSupport;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RegistrationRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
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
	private E2eSupport support;

	@BeforeEach
	void setUp() {
		support = new E2eSupport(mvc, json, users, passwords);
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
	void freeRegistrationIsVisibleAndRejoinReusesCancelledRow() throws Exception {
		var author = support.registerAndLogin(uniqueName("author"), AccountType.USER);
		var username = uniqueName("participant");
		var participant = support.registerAndLogin(username, AccountType.USER);
		var id = support.createdEventId(author, support.eventForm());
		support.registerForEvent(author, id).andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Организатор не может записаться на своё мероприятие"));
		var joined = support.registerForEvent(participant, id).andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("CONFIRMED")).andReturn();
		var row = json.readTree(joined.getResponse().getContentAsString());
		var registrationId = row.get("id").asText();
		mvc.perform(get("/api/events/{id}/registrations", id).cookie(author))
				.andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(registrationId))
				.andExpect(jsonPath("$[0].status").value("CONFIRMED"))
				.andExpect(jsonPath("$[0].participant.username").value(username));
		mvc.perform(get("/api/events/{id}", id).cookie(author)).andExpect(status().isOk())
				.andExpect(jsonPath("$.participantsCount").value(1)).andExpect(jsonPath("$.participants.length()").value(1))
				.andExpect(jsonPath("$.participants[0].username").value(username));
		assertMine(participant, registrationId, "CONFIRMED");
		support.registerForEvent(participant, id).andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Вы уже записаны на это мероприятие"));
		mvc.perform(delete("/api/events/{id}/registrations/me", id).cookie(participant))
				.andExpect(status().isOk()).andExpect(jsonPath("$.id").value(registrationId))
				.andExpect(jsonPath("$.status").value("CANCELLED"));
		mvc.perform(get("/api/events/{id}", id).cookie(author)).andExpect(status().isOk())
				.andExpect(jsonPath("$.participantsCount").value(0)).andExpect(jsonPath("$.participants.length()").value(0));
		support.registerForEvent(participant, id).andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(registrationId)).andExpect(jsonPath("$.status").value("CONFIRMED"))
				.andExpect(jsonPath("$.createdAt").value(row.get("createdAt").asText()));
		assertThat(registrations.findByEventIdOrderByCreatedAt(UUID.fromString(id)))
				.singleElement().satisfies(saved -> {
					assertThat(saved.getId()).isEqualTo(UUID.fromString(registrationId));
					assertThat(saved.getStatus()).isEqualTo(RegistrationStatus.CONFIRMED);
				});
		mvc.perform(get("/api/events/{id}", id).cookie(participant)).andExpect(status().isOk())
				.andExpect(jsonPath("$.participantsCount").value(1))
				.andExpect(jsonPath("$.viewer.registrationStatus").value("CONFIRMED"));
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
	void requestDecisionsProtectPrivateDetailsAndRespectOrganizerPermissions() throws Exception {
		var author = support.registerAndLogin(uniqueName("author"), AccountType.USER);
		var first = support.registerAndLogin(uniqueName("first"), AccountType.USER);
		var second = support.registerAndLogin(uniqueName("second"), AccountType.USER);
		var third = support.registerAndLogin(uniqueName("third"), AccountType.USER);
		var coName = uniqueName("coorganizer");
		var co = support.registerAndLogin(coName, AccountType.USER);
		var admin = support.createAdminAndLogin();
		var form = support.eventForm();
		form.put("joinMode", "REQUEST");
		form.put("format", "ONLINE");
		form.put("onlineUrl", "https://meet.example.com/private");
		form.put("privateDetails", "Код входа: 12345");
		var id = support.createdEventId(author, form);
		assertPrivateCard(first, id, null, false);
		var firstId = support.responseId(support.registerForEvent(first, id).andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("PENDING")));
		assertMine(first, firstId, "PENDING");
		assertPrivateCard(first, id, "PENDING", false);
		for (var outsider : List.of(third, admin)) {
			for (var action : List.of("approve", "reject")) {
				mvc.perform(post("/api/registrations/{id}/{action}", firstId, action).cookie(outsider)
						.contentType(APPLICATION_JSON).content(json.writeValueAsString(Map.of("reason", "Чужое решение"))))
						.andExpect(status().isForbidden())
						.andExpect(jsonPath("$.detail").value("Решение по заявке принимает только организатор"));
			}
		}
		assertMine(first, firstId, "PENDING");
		mvc.perform(post("/api/registrations/{id}/approve", firstId).cookie(author))
				.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CONFIRMED"));
		assertMine(first, firstId, "CONFIRMED");
		assertPrivateCard(first, id, "CONFIRMED", true);
		mvc.perform(get("/api/events/{id}/registrations", id).cookie(author))
				.andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(firstId))
				.andExpect(jsonPath("$[0].status").value("CONFIRMED"));
		var secondId = support.responseId(support.registerForEvent(second, id).andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("PENDING")));
		var reason = "Для этой тренировки нужен опыт";
		mvc.perform(post("/api/registrations/{id}/reject", secondId).cookie(author).contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(Map.of("reason", reason))))
				.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"))
				.andExpect(jsonPath("$.decisionReason").value(reason));
		assertMine(second, secondId, "REJECTED").andExpect(jsonPath("$[0].decisionReason").value(reason));
		assertPrivateCard(second, id, "REJECTED", false);
		mvc.perform(get("/api/events/{id}/registrations", id).cookie(author).param("status", "REJECTED"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(secondId)).andExpect(jsonPath("$[0].decisionReason").value(reason));

		mvc.perform(post("/api/events/{id}/organizers", id).cookie(author).contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(Map.of("login", coName))))
				.andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[1].user.username").value(coName));
		var coId = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(coName, coName).orElseThrow().getId();
		var thirdId = support.responseId(support.registerForEvent(third, id).andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("PENDING")));
		mvc.perform(post("/api/registrations/{id}/approve", thirdId).cookie(co))
				.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CONFIRMED"))
				.andExpect(jsonPath("$.decidedById").value(coId.toString()));
		assertMine(third, thirdId, "CONFIRMED");
		assertPrivateCard(third, id, "CONFIRMED", true);
		mvc.perform(get("/api/events/{id}/registrations", id).cookie(co).param("status", "CONFIRMED"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[*].id", hasItem(thirdId)));
		var adminMe = mvc.perform(get("/api/auth/me").cookie(admin)).andExpect(status().isOk()).andReturn();
		var adminName = json.readTree(adminMe.getResponse().getContentAsString()).get("username").asText();
		for (var outsider : List.of(co, third)) {
			mvc.perform(post("/api/events/{id}/organizers", id).cookie(outsider).contentType(APPLICATION_JSON)
					.content(json.writeValueAsString(Map.of("login", adminName))))
					.andExpect(status().isForbidden())
					.andExpect(jsonPath("$.detail").value("Состав организаторов меняет только автор мероприятия"));
		}
		mvc.perform(delete("/api/events/{id}/organizers/{userId}", id, coId).cookie(third))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.detail").value("Состав организаторов меняет только автор мероприятия"));
		mvc.perform(post("/api/events/{id}/organizers", id).cookie(author).contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(Map.of("login", adminName))))
				.andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("Администратора нельзя сделать организатором"));
		mvc.perform(get("/api/events/{id}", id).cookie(co)).andExpect(status().isOk())
				.andExpect(jsonPath("$.organizers.length()").value(2))
				.andExpect(jsonPath("$.viewer.isOrganizer").value(true))
				.andExpect(jsonPath("$.viewer.canManage").value(true))
				.andExpect(jsonPath("$.viewer.canManageOrganizers").value(false));
	}

	/**
	 * ФЛОУ: заполненная и уже начавшаяся встречи закрывают запись; одобрение тоже учитывает capacity.
	 * ШАГИ:
	 *   1. Создать FREE на одно место, занять его и получить отказ для второго USER с «Мест нет».
	 *   2. Создать REQUEST на одно место, подать две заявки, подтвердить одну, получить отказ для второй.
	 *   3. Создать будущее событие через API и перенести startAt в прошлое через EventRepository.
	 *   4. Проверить запрет записи и соответствующие viewer.canRegister/registerBlockedReason.
	 * ПРОВЕРЯЕМ: 409 и точные причины, один CONFIRMED и оставшийся PENDING, отсутствие поздней записи в БД.
	 * ПОЧЕМУ ВАЖНО: API не должен переполнять встречу ни прямой записью, ни решением организатора, ни после начала.
	 */
	@Test
	void capacityAndStartedEventBlockRegistrationAndApproval() throws Exception {
		var author = support.registerAndLogin(uniqueName("author"), AccountType.USER);
		var first = support.registerAndLogin(uniqueName("first"), AccountType.USER);
		var second = support.registerAndLogin(uniqueName("second"), AccountType.USER);
		var form = support.eventForm();
		form.put("capacity", 1);
		var freeId = support.createdEventId(author, form);
		support.registerForEvent(first, freeId).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("CONFIRMED"));
		support.registerForEvent(second, freeId).andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("Мест нет"));
		mvc.perform(get("/api/events/{id}", freeId).cookie(second)).andExpect(status().isOk())
				.andExpect(jsonPath("$.viewer.canRegister").value(false)).andExpect(jsonPath("$.viewer.registerBlockedReason").value("Мест нет"));
		form.put("joinMode", "REQUEST");
		var requestId = support.createdEventId(author, form);
		var firstId = support.responseId(support.registerForEvent(first, requestId).andExpect(status().isCreated()));
		var secondId = support.responseId(support.registerForEvent(second, requestId).andExpect(status().isCreated()));
		mvc.perform(post("/api/registrations/{id}/approve", firstId).cookie(author)).andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("CONFIRMED"));
		mvc.perform(post("/api/registrations/{id}/approve", secondId).cookie(author)).andExpect(status().isConflict())
				.andExpect(jsonPath("$.detail").value("Мест нет"));
		assertThat(registrations.countByEventIdAndStatus(UUID.fromString(requestId), RegistrationStatus.CONFIRMED)).isEqualTo(1);
		assertThat(registrations.findById(UUID.fromString(secondId)).orElseThrow().getStatus()).isEqualTo(RegistrationStatus.PENDING);
		var pastId = support.createdEventId(author, support.eventForm());
		var past = events.findById(UUID.fromString(pastId)).orElseThrow();
		past.setStartAt(Instant.now().minusSeconds(60));
		events.saveAndFlush(past);
		var reason = "Мероприятие уже началось, запись закрыта";
		support.registerForEvent(second, pastId).andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value(reason));
		mvc.perform(get("/api/events/{id}", pastId).cookie(second)).andExpect(status().isOk())
				.andExpect(jsonPath("$.viewer.canRegister").value(false)).andExpect(jsonPath("$.viewer.registerBlockedReason").value(reason));
		assertThat(registrations.findByEventIdOrderByCreatedAt(UUID.fromString(pastId))).isEmpty();
	}

	/**
	 * ФЛОУ: несколько людей одновременно пытаются занять последние места свободной встречи.
	 * ШАГИ:
	 *   1. Через API подготовить автора, четырёх участников и FREE с capacity = 2.
	 *   2. Запустить четыре потока, дождаться их готовности и одновременно открыть барьер старта.
	 *   3. Собрать ответы с ограничением времени; сверить два успеха и два отказа «Мест нет».
	 *   4. Перечитать Registration из БД и участников карточки после завершения всех транзакций.
	 * ПРОВЕРЯЕМ: ровно capacity строк CONFIRMED, отсутствие лишних строк и согласованный счётчик карточки.
	 * ПОЧЕМУ ВАЖНО: последовательные запросы не обнаруживают потерю блокировки, позволяющую переполнить встречу.
	 */
	@Test
	void parallelRegistrationsConfirmExactlyCapacityParticipants() throws Exception {
		int capacity = 2;
		int attempts = 4;
		var author = support.registerAndLogin(uniqueName("author"), AccountType.USER);
		var cookies = new ArrayList<Cookie>();
		for (int i = 0; i < attempts; i++) {
			cookies.add(support.registerAndLogin(uniqueName("racer"), AccountType.USER));
		}
		var form = support.eventForm();
		form.put("capacity", capacity);
		var id = support.createdEventId(author, form);
		var ready = new CountDownLatch(attempts);
		var start = new CountDownLatch(1);
		var pool = Executors.newFixedThreadPool(attempts);
		var futures = new ArrayList<Future<Integer>>();
		try {
			for (var access : cookies) {
				futures.add(pool.submit(() -> {
					ready.countDown();
					assertThat(start.await(5, TimeUnit.SECONDS)).isTrue();
					var result = support.registerForEvent(access, id).andReturn();
					var code = result.getResponse().getStatus();
					var body = json.readTree(result.getResponse().getContentAsString());
					assertThat(code).isIn(201, 409);
					if (code == 201) {
						assertThat(body.get("status").asText()).isEqualTo("CONFIRMED");
					} else {
						assertThat(body.get("detail").asText()).isEqualTo("Мест нет");
					}
					return code;
				}));
			}
			assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
			start.countDown();
			var statuses = new ArrayList<Integer>();
			for (var future : futures) {
				statuses.add(future.get(10, TimeUnit.SECONDS));
			}
			assertThat(statuses).containsExactlyInAnyOrder(201, 201, 409, 409);
		} finally {
			start.countDown();
			pool.shutdownNow();
			assertThat(pool.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
		}
		assertThat(registrations.findByEventIdOrderByCreatedAt(UUID.fromString(id))).hasSize(capacity)
				.allSatisfy(row -> assertThat(row.getStatus()).isEqualTo(RegistrationStatus.CONFIRMED));
		mvc.perform(get("/api/events/{id}", id).cookie(author)).andExpect(status().isOk())
				.andExpect(jsonPath("$.participantsCount").value(capacity))
				.andExpect(jsonPath("$.participants.length()").value(capacity));
	}

	private ResultActions assertMine(Cookie access, String registrationId, String expectedStatus) throws Exception {
		return mvc.perform(get("/api/registrations/mine").cookie(access)).andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value(registrationId)).andExpect(jsonPath("$[0].status").value(expectedStatus));
	}

	private void assertPrivateCard(Cookie access, String id, String expectedStatus, boolean visible) throws Exception {
		mvc.perform(get("/api/events/{id}", id).cookie(access)).andExpect(status().isOk())
				.andExpect(jsonPath("$.viewer.registrationStatus").value(expectedStatus == null ? nullValue() : is(expectedStatus)))
				.andExpect(jsonPath("$.viewer.canSeePrivateDetails").value(visible))
				.andExpect(jsonPath("$.privateDetails").value(visible ? is("Код входа: 12345") : nullValue()))
				.andExpect(jsonPath("$.onlineUrl").value(visible ? is("https://meet.example.com/private") : nullValue()));
	}
}
