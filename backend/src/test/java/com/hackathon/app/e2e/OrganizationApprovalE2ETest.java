package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.E2eSupport.uniqueName;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import com.hackathon.app.domain.enums.AccountType;
import com.hackathon.app.e2e.support.E2eSupport;
import com.hackathon.app.repository.AppUserRepository;
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

/** Допуск организации через реальные Security, API и JPA; H2 и контекст общие с остальными E2E. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class OrganizationApprovalE2ETest {

	@Autowired
	MockMvc mvc;
	@Autowired
	ObjectMapper json;
	@Autowired
	AppUserRepository users;
	@Autowired
	PasswordEncoder passwords;

	private E2eSupport support;

	@BeforeEach
	void setUp() {
		support = new E2eSupport(mvc, json, users, passwords);
	}

	/**
	 * ФЛОУ: организация подаёт первую анкету, получает допуск и публикует событие без повторной модерации.
	 * ШАГИ:
	 *   1. Зарегистрировать ORG и войти; до заполнения анкеты кабинет возвращает 404.
	 *   2. Сохранить анкету: PENDING; до допуска публичная страница возвращает 404.
	 *   3. Войти администратором, найти заявку в списке PENDING и проверить аккаунт заявителя.
	 *   4. Одобрить заявку, прочитать APPROVED в кабинете организации с прежним cookie.
	 *   5. Создать событие и открыть публичную страницу и событие обычным USER.
	 * ПРОВЕРЯЕМ: статусы HTTP, items и totalElements списка, account.username, сохранённый допуск,
	 *   organizationId и PUBLISHED у события, название и контакты публичной организации.
	 * ПОЧЕМУ ВАЖНО: это сценарий приёмки допуска клуба; до проверки клуб скрыт, после неё может
	 *   сразу собирать участников, а посетитель видит контакты и опубликованное событие.
	 */
	@Test
	void approvedOrganizationPublishesEventAndBecomesVisibleToUser() throws Exception {
		// Новый аккаунт организации пока не имеет анкеты.
		var username = uniqueName("org");
		var org = support.registerAndLogin(username, AccountType.ORG);
		mvc.perform(get("/api/organizations/me").cookie(org)).andExpect(status().isNotFound());

		// Сохранение анкеты одновременно подаёт заявку на допуск.
		var name = uniqueName("Клуб ");
		var contacts = Map.of("PHONE", "+79001234567", "EMAIL", "club@example.com");
		var saved = saveQuestionnaire(org, name, contacts)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("PENDING")).andReturn();
		var id = json.readTree(saved.getResponse().getContentAsString()).get("id").asText();
		mvc.perform(get("/api/organizations/{id}", id).cookie(org)).andExpect(status().isNotFound());

		// Фильтр по уникальному названию исключает влияние заявок из других тестов.
		var admin = support.createAdminAndLogin();
		mvc.perform(get("/api/admin/organizations").cookie(admin).param("status", "PENDING").param("searchText", name))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items.length()").value(1))
				.andExpect(jsonPath("$.totalElements").value(1))
				.andExpect(jsonPath("$.items[0].id").value(id))
				.andExpect(jsonPath("$.items[0].status").value("PENDING"))
				.andExpect(jsonPath("$.items[0].account.username").value(username));
		mvc.perform(post("/api/admin/organizations/{id}/approve", id).cookie(admin))
				.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"));
		mvc.perform(get("/api/organizations/me").cookie(org))
				.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"));

		// Одобрение действует сразу, без повторного входа организации.
		var event = support.createEvent(org).andExpect(status().isCreated())
				.andExpect(jsonPath("$.organizationId").value(id))
				.andExpect(jsonPath("$.status").value("PUBLISHED")).andReturn();
		var eventId = json.readTree(event.getResponse().getContentAsString()).get("id").asText();
		var user = support.registerAndLogin(uniqueName("user"), AccountType.USER);
		mvc.perform(get("/api/organizations/{id}", id).cookie(user))
				.andExpect(status().isOk()).andExpect(jsonPath("$.name").value(name))
				.andExpect(jsonPath("$.contacts.PHONE").value(contacts.get("PHONE")))
				.andExpect(jsonPath("$.contacts.EMAIL").value(contacts.get("EMAIL")));
		mvc.perform(get("/api/events/{id}", eventId).cookie(user))
				.andExpect(status().isOk()).andExpect(jsonPath("$.organizationId").value(id))
				.andExpect(jsonPath("$.status").value("PUBLISHED"));
	}

	/**
	 * ФЛОУ: после отказа организация видит причину, исправляет анкету и получает допуск по той же заявке.
	 * ШАГИ:
	 *   1. Зарегистрировать ORG, сохранить анкету и отклонить её администратором с причиной.
	 *   2. Прочитать REJECTED и причину в кабинете; попытаться создать валидное событие — 403.
	 *   3. Изменить название и контакты: статус снова PENDING, идентификатор анкеты прежний.
	 *   4. Одобрить исправленную заявку и заново прочитать кабинет организации.
	 * ПРОВЕРЯЕМ: сохранение причины отказа, запрет публикации, повторную подачу без новой организации,
	 *   итоговый APPROVED и очистку rejectReason в ответе администратора и кабинете ORG.
	 * ПОЧЕМУ ВАЖНО: отказ должен объяснять проблему и позволять исправление; старый отказ не должен
	 *   запрещать публикацию навсегда или показываться как действующее решение после допуска.
	 */
	@Test
	void rejectedOrganizationResubmitsQuestionnaireAndGetsApproved() throws Exception {
		// Подаём и отклоняем первую анкету.
		var org = support.registerAndLogin(uniqueName("org"), AccountType.ORG);
		var admin = support.createAdminAndLogin();
		var saved = saveQuestionnaire(org, uniqueName("Клуб "), Map.of("PHONE", "+79001234567"))
				.andExpect(status().isOk()).andReturn();
		var id = json.readTree(saved.getResponse().getContentAsString()).get("id").asText();
		var reason = "Уточните контактный телефон клуба";
		mvc.perform(post("/api/admin/organizations/{id}/reject", id).cookie(admin)
				.contentType(APPLICATION_JSON).content(json.writeValueAsString(Map.of("reason", reason))))
				.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"));

		// Отказ виден организации и закрывает публикацию даже с валидной формой события.
		mvc.perform(get("/api/organizations/me").cookie(org)).andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("REJECTED"))
				.andExpect(jsonPath("$.rejectReason").value(reason));
		support.createEvent(org).andExpect(status().isForbidden());

		// Исправление возвращает ту же организацию на проверку.
		var correctedName = uniqueName("Исправленный клуб ");
		saveQuestionnaire(org, correctedName, Map.of("PHONE", "+79007654321"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id))
				.andExpect(jsonPath("$.status").value("PENDING"));
		mvc.perform(get("/api/organizations/me").cookie(org)).andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id)).andExpect(jsonPath("$.name").value(correctedName))
				.andExpect(jsonPath("$.contacts.PHONE").value("+79007654321"))
				.andExpect(jsonPath("$.status").value("PENDING"));

		// После допуска прежняя причина отказа очищена и в сохранённой анкете.
		mvc.perform(post("/api/admin/organizations/{id}/approve", id).cookie(admin))
				.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"))
				.andExpect(jsonPath("$.rejectReason").value(nullValue()));
		mvc.perform(get("/api/organizations/me").cookie(org)).andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("APPROVED"))
				.andExpect(jsonPath("$.rejectReason").value(nullValue()));
	}

	/**
	 * ФЛОУ: роли ограничивают доступ к кабинету и модерации, некорректные анкета и отказ не сохраняются.
	 * ШАГИ:
	 *   1. Войти как USER, ADMIN и ORG; проверить запрет кабинета ORG для USER и ADMIN.
	 *   2. Проверить запрет списка заявок для USER и создания валидного события администратором.
	 *   3. Отправить от ORG анкету с неверным телефоном, затем с пустыми contacts — обе дают 400.
	 *   4. Убедиться, что анкеты ещё нет; создать валидную и отклонить без reason — 400.
	 *   5. Повторно прочитать кабинет: заявка осталась PENDING, причины отказа нет.
	 * ПРОВЕРЯЕМ: 403 при нарушении прав, 400 при неверных данных и отсутствие изменения состояния
	 *   после ошибочных запросов; проверки выполняются через настоящий JWT из cookie и Security.
	 * ПОЧЕМУ ВАЖНО: скрытых кнопок недостаточно — API обязан защищать роли, требовать рабочий контакт
	 *   для участников и объяснение отказа для организации.
	 */
	@Test
	void roleRestrictionsAndInvalidQuestionnaireOrDecisionAreEnforced() throws Exception {
		// Проверяем права с настоящими сессиями трёх ролей.
		var user = support.registerAndLogin(uniqueName("user"), AccountType.USER);
		var admin = support.createAdminAndLogin();
		var org = support.registerAndLogin(uniqueName("org"), AccountType.ORG);
		mvc.perform(get("/api/organizations/me").cookie(user)).andExpect(status().isForbidden());
		mvc.perform(get("/api/organizations/me").cookie(admin)).andExpect(status().isForbidden());
		mvc.perform(get("/api/admin/organizations").cookie(user)).andExpect(status().isForbidden());
		support.createEvent(admin).andExpect(status().isForbidden());

		// Невалидная анкета не должна создавать организацию.
		var name = uniqueName("Клуб ");
		saveQuestionnaire(org, name, Map.of("PHONE", "not-a-phone")).andExpect(status().isBadRequest());
		saveQuestionnaire(org, name, Map.of()).andExpect(status().isBadRequest());
		mvc.perform(get("/api/organizations/me").cookie(org)).andExpect(status().isNotFound());

		// Отказ без причины не меняет статус существующей заявки.
		var saved = saveQuestionnaire(org, name, Map.of("EMAIL", "club@example.com"))
				.andExpect(status().isOk()).andReturn();
		var id = json.readTree(saved.getResponse().getContentAsString()).get("id").asText();
		mvc.perform(post("/api/admin/organizations/{id}/reject", id).cookie(admin)
				.contentType(APPLICATION_JSON).content("{}"))
				.andExpect(status().isBadRequest());
		mvc.perform(get("/api/organizations/me").cookie(org)).andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("PENDING"))
				.andExpect(jsonPath("$.rejectReason").value(nullValue()));
	}

	private ResultActions saveQuestionnaire(Cookie access, String name, Map<String, String> contacts) throws Exception {
		return mvc.perform(put("/api/organizations/me").cookie(access).contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(Map.of("name", name, "description", "Клуб совместных тренировок",
						"city", "Красноярск", "contacts", contacts))));
	}
}
