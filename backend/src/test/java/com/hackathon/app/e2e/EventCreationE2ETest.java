package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import com.hackathon.app.domain.enums.NotificationType;
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

	/**
	 * ФЛОУ: читатель последовательно загружает страницы отфильтрованной ленты до конца.
	 * ШАГИ: 1. Создать три события одного вида и одно другого. 2. Запросить страницы по два события.
	 *   3. Проверить страницу за концом выдачи и уточнить поиск до одного события.
	 * ПРОВЕРЯЕМ: totalElements и totalPages учитывают фильтр, страницы не пересекаются,
	 *   последняя неполная и пустая страницы сохраняют общее количество.
	 * ПОЧЕМУ ВАЖНО: бесконечная лента должна показать все события без дублей и правильно остановиться.
	 */
	@Test
	void feedPagesPreserveFilteredTotalAndStableOrder() {
		var author = api.newUser("pagingAuthor");
		var reader = api.newUser("pagingReader");
		var sport = uniqueName("Постраничный спорт ");
		var first = author.createEvent(EventForm.free().sport(sport));
		var second = author.createEvent(EventForm.free().sport(sport));
		var third = author.createEvent(EventForm.free().sport(sport));
		author.createEvent(EventForm.free().sport(uniqueName("Другой спорт ")));
		var sportId = first.sport().id().toString();
		var page0 = reader.feedPage(Map.of("sportId", sportId, "page", "0", "size", "2"));
		var page1 = reader.feedPage(Map.of("sportId", sportId, "page", "1", "size", "2"));
		assertThat(page0.totalElements()).isEqualTo(3);
		assertThat(page0.totalPages()).isEqualTo(2);
		assertThat(page0.page()).isZero();
		assertThat(page0.size()).isEqualTo(2);
		assertThat(page0.items()).hasSize(2);
		assertThat(page1.items()).hasSize(1).doesNotContainAnyElementsOf(page0.items());
		assertThat(page1.totalElements()).isEqualTo(3);
		assertThat(reader.feedPage(Map.of("sportId", sportId, "size", "2")).items()).isEqualTo(page0.items());
		assertThat(Stream.concat(page0.items().stream(), page1.items().stream()).map(e -> e.id()))
				.containsExactlyInAnyOrder(first.id(), second.id(), third.id());
		var end = reader.feedPage(Map.of("sportId", sportId, "page", "2", "size", "2"));
		assertThat(end.items()).isEmpty();
		assertThat(end.totalElements()).isEqualTo(3);
		var search = reader.feedPage(Map.of("sportId", sportId, "searchText", first.title(), "size", "2"));
		assertThat(search.items()).extracting(e -> e.id()).containsExactly(first.id());
		assertThat(search.totalElements()).isEqualTo(1);
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

	/**
	 * ФЛОУ: человек ищет встречу по виду спорта и месту, смотрит похожие, получает объявление организатора
	 *   и добавляет встречу в календарь.
	 * ШАГИ:
	 *   1. Два события своего вида спорта в Красноярске и одно в Москве; поиск по названию вида (ё = е).
	 *   2. Фильтр «рядом» по координатам Красноярска и Москвы.
	 *   3. Похожие для первого события; после записи на второе оно из похожих уходит.
	 *   4. Организатор публикует объявление, участник получает уведомление; не организатор — 403; снять.
	 *   5. Календарь .ics: участник видит приватные детали, посторонний — нет.
	 *   6. «мини-футбол» и «мини футбол» — два вида без конфликта slug; право создавать у USER и ADMIN.
	 * ПРОВЕРЯЕМ: поиск по виду спорта, фильтр по месту (онлайн — всегда), состав похожих, announcement и
	 *   EVENT_ANNOUNCEMENT, содержимое .ics, разные id видов, canCreate true/false с причиной.
	 * ПОЧЕМУ ВАЖНО: человек должен быстро найти встречу рядом и не упираться в тупик; организатор — сообщить
	 *   об изменении всем сразу; форма не должна падать на похожих названиях.
	 */
	@Test
	void searchNearbySimilarAnnouncementAndCalendarWork() {
		// 1. Поиск по виду спорта, в том числе «е» вместо «ё».
		var author = api.newUser("author");
		var reader = api.newUser("reader");
		var stranger = api.newUser("stranger");
		var suffix = uniqueName("");
		var sport = "Кёрлинг " + suffix;
		var first = author.createEvent(EventForm.free().sport(sport)).id();
		var second = author.createEvent(EventForm.free().sport(sport).privateDetails("Код от двери 1234")).id();
		var moscow = author.createEvent(EventForm.free().sport(sport).offline("Москва, Лужники", 55.7158, 37.5537)).id();
		assertThat(reader.search("керлинг " + suffix)).extracting(e -> e.id()).containsExactlyInAnyOrder(first, second, moscow);

		// 2. «Рядом» с Красноярском — без московского; рядом с Москвой — только он.
		assertThat(reader.feed(Map.of("searchText", suffix, "lat", "56.01", "lon", "92.89", "radiusKm", "20")))
				.extracting(e -> e.id()).containsExactlyInAnyOrder(first, second);
		assertThat(reader.feed(Map.of("searchText", suffix, "lat", "55.75", "lon", "37.62", "radiusKm", "20")))
				.extracting(e -> e.id()).containsExactly(moscow);

		// 3. Похожие: тот же вид, без этого события и без тех, куда я уже записан.
		assertThat(reader.similarEvents(first)).extracting(e -> e.id()).containsExactlyInAnyOrder(second, moscow);
		reader.joinEvent(second);
		assertThat(reader.similarEvents(first)).extracting(e -> e.id()).containsExactly(moscow);

		// 4. Объявление: участникам — уведомлением, вверху карточки.
		assertThat(author.announce(second, "Переносим на 20:00").announcement()).isEqualTo("Переносим на 20:00");
		assertThat(reader.notifications().items()).extracting(n -> n.type()).contains(NotificationType.EVENT_ANNOUNCEMENT);
		assertThatApi(() -> reader.announce(second, "Я тоже хочу")).fails(FORBIDDEN, "Объявления публикует только организатор");
		assertThat(author.clearAnnouncement(second).announcement()).isNull();

		// 5. Календарь: приватные детали — только участнику.
		var ics = reader.calendar(second);
		assertThat(ics).startsWith("BEGIN:VCALENDAR").contains("BEGIN:VEVENT", "SUMMARY:", "Код от двери 1234");
		assertThat(stranger.calendar(second)).contains("BEGIN:VEVENT").doesNotContain("Код от двери");

		// 6. Похожие названия видов не конфликтуют; право создавать считает сервер.
		var dashed = author.createEvent(EventForm.free().sport("Мини-футбол " + suffix)).sport().id();
		var spaced = author.createEvent(EventForm.free().sport("Мини футбол " + suffix)).sport().id();
		assertThat(dashed).isNotEqualTo(spaced);
		assertThat(author.createPermission().canCreate()).isTrue();
		var admin = api.newAdmin().createPermission();
		assertThat(admin.canCreate()).isFalse();
		assertThat(admin.reason()).isEqualTo("Администратор не создаёт мероприятия");
	}
}
