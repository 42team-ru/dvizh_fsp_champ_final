package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.E2eSupport.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.AccountType;
import com.hackathon.app.e2e.support.E2eSupport;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.SportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/** Сценарий приёмки 1: публикация, поиск и границы изменения события. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class EventCreationE2ETest {
	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;
	@Autowired SportRepository sports;
	private E2eSupport support;

	@BeforeEach
	void setUp() {
		support = new E2eSupport(mvc, json, users, passwords);
	}

	/**
	 * ФЛОУ: человек публикует встречи со справочным и новым видом спорта, другой находит их и открывает.
	 * ШАГИ:
	 *   1. Подготовить справочный Sport в общей H2 без зависимости от демо-данных; войти двумя USER.
	 *   2. Получить вид через справочник, создать событие по sportId и второе по новому sportName.
	 *   3. Найти каждое по searchText и sportId, проверить несовпадающую комбинацию фильтров и карточки.
	 *   4. Создать ещё событие с тем же новым видом, меняя регистр, пробелы и ё на е; перечитать справочник и БД.
	 * ПРОВЕРЯЕМ: PUBLISHED, поля карточки, оба фильтра, custom и один Sport с прежним id после нормализации.
	 * ПОЧЕМУ ВАЖНО: сценарий приёмки должен работать без демо-сида; дубли справочника дробят результаты поиска.
	 */
	@Test
	void userPublishesFindsAndOpensEventsWithoutDuplicatingCustomSport() throws Exception {
		var author = support.registerAndLogin(uniqueName("author"), AccountType.USER);
		var reader = support.registerAndLogin(uniqueName("reader"), AccountType.USER);
		var catalogue = new Sport();
		catalogue.setName(uniqueName("Шахматы "));
		catalogue.setNormalizedName(catalogue.getName().toLowerCase(Locale.ROOT));
		catalogue.setSlug(uniqueName("chess"));
		catalogue.setCustom(false);
		sports.saveAndFlush(catalogue);
		mvc.perform(get("/api/sports").cookie(author).param("query", catalogue.getName()))
				.andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(catalogue.getId().toString()))
				.andExpect(jsonPath("$[0].custom").value(false));

		var knownForm = support.eventForm();
		knownForm.remove("sportName");
		knownForm.put("sportId", catalogue.getId().toString());
		var knownId = support.createdEventId(author, knownForm);
		var customName = uniqueName("Сапсёрфинг на озёрах ");
		var customForm = support.eventForm();
		customForm.put("sportName", customName);
		var custom = support.createEvent(author, customForm).andExpect(status().isCreated())
				.andExpect(jsonPath("$.sport.custom").value(true)).andReturn();
		var body = json.readTree(custom.getResponse().getContentAsString());
		var customId = body.get("id").asText();
		var sportId = body.get("sport").get("id").asText();
		for (var entry : Map.of(knownId, catalogue.getId().toString(), customId, sportId).entrySet()) {
			var form = entry.getKey().equals(knownId) ? knownForm : customForm;
			mvc.perform(get("/api/events").cookie(reader).param("searchText", form.get("title").toString())
					.param("sportId", entry.getValue()))
					.andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
					.andExpect(jsonPath("$[0].id").value(entry.getKey()));
			mvc.perform(get("/api/events/{id}", entry.getKey()).cookie(reader))
					.andExpect(status().isOk()).andExpect(jsonPath("$.title").value(form.get("title")))
					.andExpect(jsonPath("$.sport.id").value(entry.getValue()))
					.andExpect(jsonPath("$.status").value("PUBLISHED"))
					.andExpect(jsonPath("$.viewer.canRegister").value(true));
		}
		mvc.perform(get("/api/events").cookie(reader).param("searchText", customForm.get("title").toString())
				.param("sportId", catalogue.getId().toString()))
				.andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));

		customForm.put("sportName", "  " + customName.toUpperCase(Locale.ROOT).replace('Ё', 'Е').replace(" ", "   ") + "  ");
		support.createEvent(author, customForm).andExpect(status().isCreated())
				.andExpect(jsonPath("$.sport.id").value(sportId));
		mvc.perform(get("/api/sports").cookie(reader).param("query", customName))
				.andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
				.andExpect(jsonPath("$[0].id").value(sportId));
		assertThat(sports.findByNormalizedNameContainingOrderByNameAsc(customName.toLowerCase(Locale.ROOT).replace('ё', 'е')))
				.extracting(Sport::getId).containsExactly(UUID.fromString(sportId));
	}

	/**
	 * ФЛОУ: сервер запрещает публикацию неподходящим ролям и не сохраняет невалидную форму.
	 * ШАГИ:
	 *   1. Войти как ADMIN и ORG без анкеты, отправить валидные формы — 403.
	 *   2. Подать анкету ORG, проверить PENDING и повторный запрет публикации.
	 *   3. От USER отправить окончание раньше начала, OFFLINE без адреса и форму без обязательных полей.
	 *   4. Убедиться, что ошибочные формы не появились среди событий автора.
	 * ПРОВЕРЯЕМ: 403 с объяснением роли, 400 с русскими detail бизнес-валидации и отсутствие публикации.
	 * ПОЧЕМУ ВАЖНО: API обязан проверять допуск клуба и форму независимо от доступности кнопки на фронте.
	 */
	@Test
	void forbiddenRolesAndInvalidFormsCannotPublish() throws Exception {
		var admin = support.createAdminAndLogin();
		var org = support.registerAndLogin(uniqueName("org"), AccountType.ORG);
		var user = support.registerAndLogin(uniqueName("user"), AccountType.USER);
		support.createEvent(admin).andExpect(status().isForbidden())
				.andExpect(jsonPath("$.detail").value("Администратор не создаёт мероприятия"));
		var blocked = "Публиковать мероприятия от организации можно только после одобрения заявки";
		support.createEvent(org).andExpect(status().isForbidden()).andExpect(jsonPath("$.detail").value(blocked));
		mvc.perform(put("/api/organizations/me").cookie(org).contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(Map.of("name", uniqueName("Клуб "), "description", "Совместные тренировки",
						"contacts", Map.of("EMAIL", "club@example.com")))))
				.andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PENDING"));
		support.createEvent(org).andExpect(status().isForbidden()).andExpect(jsonPath("$.detail").value(blocked));
		var form = support.eventForm();
		form.put("endAt", Instant.parse(form.get("startAt").toString()).minusSeconds(1).toString());
		support.createEvent(user, form).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Окончание должно быть позже начала"));
		form.remove("endAt");
		form.put("address", "   ");
		support.createEvent(user, form).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Для очного мероприятия нужен адрес"));
		support.createEvent(user, Map.of()).andExpect(status().isBadRequest());
		mvc.perform(get("/api/events/mine").cookie(user)).andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));
	}

	/**
	 * ФЛОУ: событие редактирует только организатор, лимит сохраняет места уже подтверждённых участников.
	 * ШАГИ:
	 *   1. Автор создаёт встречу на три места; два других USER записываются с CONFIRMED.
	 *   2. Участник пытается изменить встречу — 403; автор уменьшает capacity до одного — 409.
	 *   3. Прочитать карточку после отказов, затем разрешённо уменьшить лимит до двух.
	 * ПРОВЕРЯЕМ: точные причины отказа, прежний capacity после ошибки, сохранение двух участников и успешный PUT.
	 * ПОЧЕМУ ВАЖНО: чужая правка и потеря уже занятых мест нарушают договорённости участников с организатором.
	 */
	@Test
	void updateRequiresOrganizerAndCannotDisplaceConfirmedParticipants() throws Exception {
		var author = support.registerAndLogin(uniqueName("author"), AccountType.USER);
		var first = support.registerAndLogin(uniqueName("first"), AccountType.USER);
		var second = support.registerAndLogin(uniqueName("second"), AccountType.USER);
		var form = support.eventForm();
		form.put("capacity", 3);
		var id = support.createdEventId(author, form);
		support.registerForEvent(first, id).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("CONFIRMED"));
		support.registerForEvent(second, id).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("CONFIRMED"));
		mvc.perform(put("/api/events/{id}", id).cookie(first).contentType(APPLICATION_JSON).content(json.writeValueAsString(form)))
				.andExpect(status().isForbidden()).andExpect(jsonPath("$.detail").value("Редактировать мероприятие может только организатор"));
		form.put("capacity", 1);
		mvc.perform(put("/api/events/{id}", id).cookie(author).contentType(APPLICATION_JSON).content(json.writeValueAsString(form)))
				.andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("Уже записано 2, лимит мест не может быть меньше"));
		mvc.perform(get("/api/events/{id}", id).cookie(author)).andExpect(status().isOk())
				.andExpect(jsonPath("$.capacity").value(3)).andExpect(jsonPath("$.participantsCount").value(2));
		form.put("capacity", 2);
		mvc.perform(put("/api/events/{id}", id).cookie(author).contentType(APPLICATION_JSON).content(json.writeValueAsString(form)))
				.andExpect(status().isOk()).andExpect(jsonPath("$.capacity").value(2))
				.andExpect(jsonPath("$.participantsCount").value(2));
	}
}
