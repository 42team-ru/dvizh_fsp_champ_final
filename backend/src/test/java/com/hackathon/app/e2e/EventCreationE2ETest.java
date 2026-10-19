package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.e2e.support.Actor;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.OrganizationForm;
import com.hackathon.app.e2e.support.TestApi;
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
	private TestApi api;

	@BeforeEach
	void setUp() {
		api = new TestApi(mvc, json, users, passwords);
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
	void userPublishesFindsAndOpensEventsWithoutDuplicatingCustomSport() {
		// 1. Справочник готовим независимо от демо-данных.
		var author = api.newUser("author");
		var reader = api.newUser("reader");
		var catalogue = new Sport();
		catalogue.setName(uniqueName("Шахматы "));
		catalogue.setNormalizedName(catalogue.getName().toLowerCase(Locale.ROOT));
		catalogue.setSlug(uniqueName("chess"));
		catalogue.setCustom(false);
		sports.saveAndFlush(catalogue);
		assertThat(author.sports(catalogue.getName())).singleElement().satisfies(sport -> {
			assertThat(sport.id()).isEqualTo(catalogue.getId());
			assertThat(sport.custom()).isFalse();
		});

		// 2. Публикуем со справочным и новым видом, проверяем поиск и карточку.
		var knownForm = EventForm.free().sportId(catalogue.getId());
		var known = author.createEvent(knownForm);
		var customName = uniqueName("Сапсёрфинг на озёрах ");
		var customForm = EventForm.free().sport(customName);
		var custom = author.createEvent(customForm);
		assertThat(custom.sport().custom()).isTrue();
		assertFoundAndPublished(reader, known.id(), knownForm.get("title").toString(), catalogue.getId());
		assertFoundAndPublished(reader, custom.id(), customForm.get("title").toString(), custom.sport().id());
		assertThat(reader.feed(Map.of("searchText", customForm.get("title").toString(), "sportId", catalogue.getId().toString()))).isEmpty();

		// 3. Регистр, пробелы и ё/е не создают новый вид спорта.
		customForm.sport("  " + customName.toUpperCase(Locale.ROOT).replace('Ё', 'Е').replace(" ", "   ") + "  ");
		assertThat(author.createEvent(customForm).sport().id()).isEqualTo(custom.sport().id());
		assertThat(reader.sports(customName)).extracting(s -> s.id()).containsExactly(custom.sport().id());
		assertThat(sports.findByNormalizedNameContainingOrderByNameAsc(customName.toLowerCase(Locale.ROOT).replace('ё', 'е')))
				.extracting(Sport::getId).containsExactly(custom.sport().id());
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
	void forbiddenRolesAndInvalidFormsCannotPublish() {
		// 1. Роль и допуск проверяются при каждой публикации.
		var admin = api.newAdmin();
		var org = api.newOrganization("org");
		var user = api.newUser("user");
		assertThatApi(() -> admin.createEvent(EventForm.free())).fails(FORBIDDEN, "Администратор не создаёт мероприятия");
		var blocked = "Публиковать мероприятия от организации можно только после одобрения заявки";
		assertThatApi(() -> org.createEvent(EventForm.free())).fails(FORBIDDEN, blocked);
		assertThat(org.submitOrganization(OrganizationForm.valid().noContacts().contact("EMAIL", "club@example.com")).status())
				.isEqualTo(OrganizationStatus.PENDING);
		assertThatApi(() -> org.createEvent(EventForm.free())).fails(FORBIDDEN, blocked);

		// 2. Невалидная форма не создаёт события.
		var form = EventForm.free();
		form.endsAt(Instant.parse(form.get("startAt").toString()).minusSeconds(1));
		assertThatApi(() -> user.createEvent(form)).fails(BAD_REQUEST, "Окончание должно быть позже начала");
		form.without("endAt").with("address", "   ");
		assertThatApi(() -> user.createEvent(form)).fails(BAD_REQUEST, "Для очного мероприятия нужен адрес");
		assertThatApi(() -> user.createEvent(EventForm.empty())).fails(BAD_REQUEST);
		assertThat(user.myEvents()).isEmpty();
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
	void updateRequiresOrganizerAndCannotDisplaceConfirmedParticipants() {
		// 1. Два подтверждённых участника занимают места.
		var author = api.newUser("author");
		var first = api.newUser("first");
		var second = api.newUser("second");
		var form = EventForm.free().capacity(3);
		var id = author.createEvent(form).id();
		assertThat(first.joinEvent(id).status()).isEqualTo(RegistrationStatus.CONFIRMED);
		assertThat(second.joinEvent(id).status()).isEqualTo(RegistrationStatus.CONFIRMED);

		// 2. Чужая правка и вытеснение участников запрещены.
		assertThatApi(() -> first.updateEvent(id, form)).fails(FORBIDDEN, "Редактировать мероприятие может только организатор");
		form.capacity(1);
		assertThatApi(() -> author.updateEvent(id, form)).fails(CONFLICT, "Уже записано 2, лимит мест не может быть меньше");
		var unchanged = author.openEvent(id);
		assertThat(unchanged.capacity()).isEqualTo(3);
		assertThat(unchanged.participantsCount()).isEqualTo(2);

		// 3. Лимит по числу занятых мест допустим.
		var updated = author.updateEvent(id, form.capacity(2));
		assertThat(updated.capacity()).isEqualTo(2);
		assertThat(updated.participantsCount()).isEqualTo(2);
	}

	private void assertFoundAndPublished(Actor reader, UUID id, String title, UUID sportId) {
		assertThat(reader.feed(Map.of("searchText", title, "sportId", sportId.toString())))
				.extracting(e -> e.id()).containsExactly(id);
		var card = reader.openEvent(id);
		assertThat(card.title()).isEqualTo(title);
		assertThat(card.sport().id()).isEqualTo(sportId);
		assertThat(card.status()).isEqualTo(EventStatus.PUBLISHED);
		assertThat(card.viewer().canRegister()).isTrue();
	}
}
