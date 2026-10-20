package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.ScheduleRequest;
import com.hackathon.app.domain.dto.ScheduleRuleRequest;
import com.hackathon.app.domain.dto.UpdateProfileRequest;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.NotificationType;
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

	/**
	 * ФЛОУ: читатель выбирает свой город и видит местные встречи вместе с онлайн-событиями.
	 * ШАГИ: 1. Через API создать встречи одного нового вида в Красноярске, Москве и онлайн.
	 *   2. Запросить ленту вокруг центра Красноярска, затем Москвы с радиусом города 30 км.
	 *   3. Убрать географический фильтр («Все города») и перечитать ленту.
	 * ПРОВЕРЯЕМ: чужой город исключён, онлайн остаётся в обоих городах; без координат видны все три,
	 *   totalElements соответствует фильтру, а не общему количеству событий.
	 * ПОЧЕМУ ВАЖНО: у события нет поля city; фильтр по координатам должен работать на H2
	 *   без разбора адресов и не скрывать доступные из любого города онлайн-встречи.
	 */
	@Test
	void cityCoordinatesIncludeLocalAndOnlineEventsAndCountOnlyMatches() {
		var author = api.newUser("cityAuthor");
		var reader = api.newUser("cityReader");
		var sport = uniqueName("Городской спорт ");
		var local = author.createEvent(EventForm.free().sport(sport));
		var moscow = author.createEvent(EventForm.free().sport(sport)
				.offline("Москва, Лужники", 55.7158, 37.5537));
		var online = author.createEvent(EventForm.free().sport(sport).online("https://meet.example.com/city"));
		var sportId = local.sport().id().toString();

		var city = reader.feedPage(Map.of("sportId", sportId, "lat", "56.0153",
				"lon", "92.8932", "radiusKm", "30"));
		assertThat(city.items()).extracting(e -> e.id()).containsExactlyInAnyOrder(local.id(), online.id());
		assertThat(city.totalElements()).isEqualTo(2);
		var other = reader.feedPage(Map.of("sportId", sportId, "lat", "55.7558",
				"lon", "37.6173", "radiusKm", "30"));
		assertThat(other.items()).extracting(e -> e.id()).containsExactlyInAnyOrder(moscow.id(), online.id());
		assertThat(other.totalElements()).isEqualTo(2);

		var all = reader.feedPage(Map.of("sportId", sportId));
		assertThat(all.items()).extracting(e -> e.id()).containsExactlyInAnyOrder(local.id(), moscow.id(), online.id());
		assertThat(all.totalElements()).isEqualTo(3);
	}

    /**
     * ФЛОУ: читатель ленты видит реальных подтверждённых участников и их публичные образы.
     * ШАГИ:
     *   1. Создать встречу по заявке, оставить ожидающую, отклонённую и отменённую записи.
     *   2. Подтвердить четырёх людей; одному изменить имя и фамилию через профиль.
     *   3. Прочитать ленту: сверить три превью с публичными данными участников и проверить пустую встречу.
     *   4. Создать серию, записать двух людей; отметить их на разные занятия и снова прочитать ленту.
     * ПРОВЕРЯЕМ: не больше трёх превью, только CONFIRMED, имена и питомец; у серии — участник ближайшего занятия.
     * ПОЧЕМУ ВАЖНО: лица в карточке должны соответствовать людям и счётчику, а заявки не должны попадать в превью.
     */
    @Test
    void feedPreviewsShowConfirmedPeopleAndNearestOccurrenceAttendees() {
        var author = api.newUser("previewAuthor");
        var reader = api.newUser("previewReader");
        var title = uniqueName("Лица участников ");
        var event = author.createEvent(EventForm.byRequest().title(title));
        reader.joinEvent(event.id());
        var rejected = api.newUser("previewRejected");
        author.reject(rejected.joinEvent(event.id()).id(), "Другая группа");
        var cancelled = api.newUser("previewCancelled");
        cancelled.joinEvent(event.id());
        cancelled.cancelRegistration(event.id());
        var confirmed = new ArrayList<Actor>();
        for (int n = 0; n < 4; n++) {
            var person = api.newUser("previewConfirmed");
            person.updateProfile(new UpdateProfileRequest("Анна", "Смирнова", null, null));
            person.savePet(new PetRequest("none", Map.of("hat", "headband")));
            if (n == 0) person.uploadAvatar(Base64.getDecoder().decode(
                    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9gAAAABJRU5ErkJggg=="));
            author.approve(person.joinEvent(event.id()).id());
            confirmed.add(person);
        }
        var card = reader.feed(Map.of("searchText", title)).getFirst();
        assertThat(card.participantsCount()).isEqualTo(4);
        assertThat(card.participantsPreview()).hasSize(3);
        assertThat(card.participantsPreview()).extracting(p -> p.id())
                .containsExactlyElementsOf(confirmed.subList(0, 3).stream().map(Actor::id).toList());
        for (var person : card.participantsPreview()) {
            var actor = confirmed.stream().filter(p -> p.id().equals(person.id())).findFirst().orElseThrow();
            assertThat(person.username()).isEqualTo(actor.username());
            assertThat(person.avatarUrl()).isEqualTo(actor.me().avatarUrl());
            assertThat(person.firstName()).isEqualTo("Анна");
            assertThat(person.lastName()).isEqualTo("Смирнова");
            assertThat(person.pet().outfit()).isEqualTo(actor.pet().outfit());
            assertThat(person.pet().name()).isEqualTo(actor.pet().name());
        }
        var empty = author.createEvent(EventForm.free().title(uniqueName("Без участников ")));
        assertThat(reader.feed(Map.of("searchText", empty.title())).getFirst().participantsPreview()).isEmpty();

        var start = LocalDate.now(ZoneOffset.UTC).plusDays(2);
        var series = author.createEvent(EventForm.free().title(uniqueName("Лица серии "))
                .schedule(new ScheduleRequest("UTC", start, start.plusDays(2), List.of(
                        new ScheduleRuleRequest(start.atTime(18, 0), 60, "FREQ=DAILY")))));
        var sessions = reader.occurrences(series.id());
        confirmed.get(0).joinEvent(series.id());
        confirmed.get(1).joinEvent(series.id());
        confirmed.get(0).attend(series.id(), sessions.get(0).id());
        confirmed.get(1).attend(series.id(), sessions.get(1).id());
        var seriesCard = reader.feed(Map.of("searchText", series.title())).getFirst();
        assertThat(seriesCard.occurrenceAttendeesCount()).isEqualTo(1);
        assertThat(seriesCard.participantsPreview()).extracting(p -> p.id()).containsExactly(confirmed.get(0).id());
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
