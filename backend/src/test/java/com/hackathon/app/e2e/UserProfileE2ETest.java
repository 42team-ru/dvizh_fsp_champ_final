package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.SaveUserSportsRequest;
import com.hackathon.app.domain.dto.UpdateProfileRequest;
import com.hackathon.app.domain.dto.UserSportRequest;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.e2e.support.EventForm;
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

/** Правка профиля, спортивные интересы и персональная лента без зависимости от демо-данных. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class UserProfileE2ETest {
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
	 * ФЛОУ: человек меняет профиль и интересы, другой видит обновлённую публичную карточку.
	 * ШАГИ:
	 *   1. Зарегистрировать двух USER и подготовить справочный вид без демо-сида.
	 *   2. Изменить имя, фамилию, город и рассказ о себе; перечитать собственный профиль.
	 *   3. Сохранить новый вид по названию и справочный по id с уровнем, прочитать список и публичную карточку.
	 *   4. Передать пробельные город и рассказ о себе, повторно открыть оба профиля.
	 * ПРОВЕРЯЕМ: поля MeResponse сохраняются; виды отсортированы по имени, новый имеет custom;
	 * публичная карточка содержит те же интересы и уровень; пустые город и bio становятся null, интересы остаются.
	 * ПОЧЕМУ ВАЖНО: правка должна сохраняться между запросами и одинаково отображаться владельцу и другим людям.
	 */
	@Test
	void editedProfileAndSportsAreVisibleToAnotherUser() {
		// 1. Два участника и справочный вид независимо от демо-данных.
		var owner = api.newUser("profile");
		var reader = api.newUser("reader");
		var reference = referenceSport();
		var customName = uniqueName("Сапсёрфинг ");

		// 2. Правка возвращает и сохраняет новые поля.
		var updated = owner.updateProfile(new UpdateProfileRequest("Анна", "Смирнова", "Красноярск", "Ищу компанию для спорта"));
		assertThat(updated.id()).isEqualTo(owner.id());
		assertThat(updated.firstName()).isEqualTo("Анна");
		assertThat(updated.lastName()).isEqualTo("Смирнова");
		assertThat(updated.city()).isEqualTo("Красноярск");
		assertThat(updated.bio()).isEqualTo("Ищу компанию для спорта");
		assertThat(owner.me()).isEqualTo(updated);

		// 3. Обратный алфавитный порядок запроса не влияет на порядок ответа.
		var saved = owner.saveMySports(new SaveUserSportsRequest(List.of(
				new UserSportRequest(null, "  " + customName + "  ", null),
				new UserSportRequest(reference.getId(), null, SportLevel.AMATEUR))));
		assertThat(saved).extracting(s -> s.sport().name()).containsExactly(reference.getName(), customName);
		assertThat(saved.getFirst().sport().id()).isEqualTo(reference.getId());
		assertThat(saved.getFirst().sport().custom()).isFalse();
		assertThat(saved.getFirst().level()).isEqualTo(SportLevel.AMATEUR);
		assertThat(saved.getLast().sport().custom()).isTrue();
		assertThat(saved.getLast().level()).isNull();
		assertThat(owner.mySports()).isEqualTo(saved);
		var publicProfile = reader.openUser(owner.id());
		assertThat(publicProfile.firstName()).isEqualTo(updated.firstName());
		assertThat(publicProfile.lastName()).isEqualTo(updated.lastName());
		assertThat(publicProfile.city()).isEqualTo(updated.city());
		assertThat(publicProfile.bio()).isEqualTo(updated.bio());
		assertThat(publicProfile.sports()).isEqualTo(saved);
		assertThat(reader.mySports()).isEmpty();

		// 4. Пробельные поля стирают прежние значения, не затрагивая интересы.
		var cleared = owner.updateProfile(new UpdateProfileRequest("Анна", "Смирнова", "   ", " \t "));
		assertThat(cleared.city()).isNull();
		assertThat(cleared.bio()).isNull();
		assertThat(owner.me()).isEqualTo(cleared);
		var afterClear = reader.openUser(owner.id());
		assertThat(afterClear.city()).isNull();
		assertThat(afterClear.bio()).isNull();
		assertThat(afterClear.sports()).isEqualTo(saved);
	}

	/**
	 * ФЛОУ: пользователь подбирает чужие события по своим видам спорта и уровню, затем меняет интересы.
	 * ШАГИ:
	 *   1. Автор публикует четыре будущие встречи: три одного вида с уровнями AMATEUR, ANY, PRO и одну другого вида.
	 *   2. Читатель сохраняет первый вид с уровнем AMATEUR, сравнивает персональную и обычную ленты.
	 *   3. Убирает уровень, затем полностью заменяет вид спорта на другой и снова читает ленту.
	 *   4. Очищает интересы и проверяет персональную ленту, публичный профиль и обычную ленту.
	 * ПРОВЕРЯЕМ: с уровнем подходят ровно AMATEUR и ANY, без уровня подходят все три встречи своего вида;
	 * замена убирает прежний вид, пустые интересы дают пустую ленту, обычная лента содержит все четыре события.
	 * ПОЧЕМУ ВАЖНО: подбор должен учитывать интересы читателя, а очистка и замена должны убирать старые рекомендации.
	 */
	@Test
	void personalFeedUsesSportsAndLevelsAndReflectsReplacementAndClearing() {
		// 1. Уникальный маркер изолирует встречи от остальных тестов общей H2.
		var author = api.newUser("author");
		var reader = api.newUser("reader");
		var marker = uniqueName("Подбор ");
		var reference = referenceSport();
		var matching = author.createEvent(EventForm.free().title(marker + " любители").sportId(reference.getId()).level("AMATEUR"));
		var any = author.createEvent(EventForm.free().title(marker + " любой").sportId(reference.getId()).level("ANY"));
		var differentLevel = author.createEvent(EventForm.free().title(marker + " профи").sportId(reference.getId()).level("PRO"));
		var other = author.createEvent(EventForm.free().title(marker + " другой спорт").sport(uniqueName("Другой спорт ")).level("BEGINNER"));
		var personal = Map.of("searchText", marker, "forMe", "true");
		assertThat(reader.feed(personal)).isEmpty();

		// 2. Подходят свой уровень и ANY, чужой вид спорта исключается.
		reader.saveMySports(new SaveUserSportsRequest(List.of(new UserSportRequest(reference.getId(), null, SportLevel.AMATEUR))));
		assertThat(reader.feed(personal)).extracting(EventSummaryResponse::id).containsExactlyInAnyOrder(matching.id(), any.id());
		assertThat(reader.search(marker)).extracting(EventSummaryResponse::id)
				.containsExactlyInAnyOrder(matching.id(), any.id(), differentLevel.id(), other.id());

		// 3. Неуказанный уровень не ограничивает подбор, новая коллекция заменяет старую.
		reader.saveMySports(new SaveUserSportsRequest(List.of(new UserSportRequest(reference.getId(), null, null))));
		assertThat(reader.feed(personal)).extracting(EventSummaryResponse::id)
				.containsExactlyInAnyOrder(matching.id(), any.id(), differentLevel.id());
		var replaced = reader.saveMySports(new SaveUserSportsRequest(List.of(new UserSportRequest(other.sport().id(), null, null))));
		assertThat(replaced).singleElement().satisfies(s -> assertThat(s.sport().id()).isEqualTo(other.sport().id()));
		assertThat(reader.mySports()).isEqualTo(replaced);
		assertThat(reader.feed(personal)).extracting(EventSummaryResponse::id).containsExactly(other.id());

		// 4. Очистка действует на интересы и подбор; обычная лента сохраняет все события.
		assertThat(reader.saveMySports(new SaveUserSportsRequest(List.of()))).isEmpty();
		assertThat(reader.mySports()).isEmpty();
		assertThat(author.openUser(reader.id()).sports()).isEmpty();
		assertThat(reader.feed(Map.of("forMe", "true"))).isEmpty();
		assertThat(reader.search(marker)).extracting(EventSummaryResponse::id)
				.containsExactlyInAnyOrder(matching.id(), any.id(), differentLevel.id(), other.id());
	}

	/**
	 * ФЛОУ: повтор одного вида схлопывается, а ошибочная замена не повреждает сохранённые интересы.
	 * ШАГИ:
	 *   1. Создать свой вид через профиль, повторить его по id и нормализованному имени с разными уровнями.
	 *   2. Проверить один вид с последним уровнем и единственный результат поиска в справочнике.
	 *   3. После валидного элемента отправить ошибочный: одновременно id и имя, ни одного идентификатора, неизвестный id.
	 *   4. После каждого отказа перечитать интересы и проверить прежнее значение.
	 * ПРОВЕРЯЕМ: регистр, пробелы и ё/е не создают дублей; последний уровень побеждает;
	 * неверные элементы дают 400 с русским detail, частичное изменение списка не сохраняется.
	 * ПОЧЕМУ ВАЖНО: повторный выбор не должен дублировать интересы, а ошибка формы не должна стирать прежние настройки.
	 */
	@Test
	void duplicateSportsUseLastLevelAndInvalidItemsLeavePreferencesUnchanged() {
		// 1. Один вид приходит по id и имени с другим регистром, пробелами и е вместо ё.
		var owner = api.newUser("sports");
		var name = uniqueName("Сапсёрфинг ");
		var original = owner.saveMySports(new SaveUserSportsRequest(List.of(new UserSportRequest(null, name, null)))).getFirst();
		var normalized = "  " + name.toUpperCase(Locale.ROOT).replace('Ё', 'Е').replace(" ", "   ") + "  ";
		var saved = owner.saveMySports(new SaveUserSportsRequest(List.of(
				new UserSportRequest(original.sport().id(), null, SportLevel.BEGINNER),
				new UserSportRequest(null, normalized, SportLevel.PRO))));
		assertThat(saved).singleElement().satisfies(s -> {
			assertThat(s.sport().id()).isEqualTo(original.sport().id());
			assertThat(s.level()).isEqualTo(SportLevel.PRO);
		});
		assertThat(owner.mySports()).isEqualTo(saved);
		assertThat(owner.sports(normalized)).extracting(s -> s.id()).containsExactly(original.sport().id());

		// 2. Валидное изменение перед ошибочным элементом тоже должно откатиться.
		var validChange = new UserSportRequest(original.sport().id(), null, SportLevel.AMATEUR);
		var invalidChoices = List.of(
				new UserSportRequest(original.sport().id(), name, null),
				new UserSportRequest(null, null, null));
		for (var invalid : invalidChoices) {
			assertThatApi(() -> owner.saveMySports(new SaveUserSportsRequest(List.of(validChange, invalid))))
					.fails(BAD_REQUEST, "Выберите вид спорта из списка или введите свой");
			assertThat(owner.mySports()).isEqualTo(saved);
		}
		assertThatApi(() -> owner.saveMySports(new SaveUserSportsRequest(List.of(
				validChange, new UserSportRequest(UUID.randomUUID(), null, null)))))
				.fails(BAD_REQUEST, "Неизвестный вид спорта");
		assertThat(owner.mySports()).isEqualTo(saved);
	}

	/** Справочный вид готовим через репозиторий: H2 не запускает миграции со справочником. */
	private Sport referenceSport() {
		var sport = new Sport();
		sport.setName(uniqueName("Бадминтон "));
		sport.setNormalizedName(sport.getName().toLowerCase(Locale.ROOT));
		sport.setSlug(uniqueName("badminton"));
		sport.setCustom(false);
		return sports.saveAndFlush(sport);
	}
}
