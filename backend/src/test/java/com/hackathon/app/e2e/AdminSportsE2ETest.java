package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import javax.imageio.ImageIO;

import com.hackathon.app.domain.dto.AdminSportResponse;
import com.hackathon.app.domain.dto.FocusPoint;
import com.hackathon.app.domain.dto.SaveUserSportsRequest;
import com.hackathon.app.domain.dto.UserSportRequest;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.domain.enums.SportStatus;
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

/** Сквозные сценарии справочника: картинки, модерация и объединение видов. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class AdminSportsE2ETest {
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
	 * ФЛОУ: админ добавляет вид с PNG, меняет картинку и название; пользователь видит актуальный справочник.
	 * ШАГИ:
	 *   1. Создать ADMIN, USER и ORG; добавить опубликованный вид с PNG 256×256 и точкой фокуса.
	 *   2. Проверить запрет чтения и изменения админского справочника для USER и ORG.
	 *   3. Отклонить маленький, неквадратный, слишком большой PNG и неверный формат без потери картинки.
	 *   4. Заменить PNG и фокус, удалить картинку, проверить заглушку; переименовать и отклонить дубль.
	 *   5. Создать скрытый черновик, проверить отсутствие в поиске и публикацию через восстановление.
	 * ПРОВЕРЯЕМ: ACTIVE, URL файла и фокус в поиске, 400 на некорректную картинку, заглушку, 409 при нормализации
	 *   регистра/пробелов/ё, 403 для USER и ORG, HIDDEN у черновика и появление после публикации.
	 * ПОЧЕМУ ВАЖНО: справочник должен показывать правильную иллюстрацию, не плодить дубли и защищать изменения.
	 */
	@Test
	void adminManagesImagesNamesAndDraftWhileOtherRolesAreForbidden() throws IOException {
		var admin = api.newAdmin();
		var user = api.newUser("sportsReader");
		var org = api.newOrganization("sportsOrg");
		var name = uniqueName("Кёрлинг на воде ");
		var png = png(256, 256);
		var created = admin.createSport(name, png, 31, 17, true);
		assertThat(created.status()).isEqualTo(SportStatus.ACTIVE);
		assertThat(created.imageUploaded()).isTrue();
		assertThat(created.imageUrl()).matches("/api/files/[0-9a-f-]{36}");
		assertThat(created.imageFocus()).isEqualTo(new FocusPoint(31, 17));

		// Не-админы не могут читать админку и менять её данные.
		for (var actor : List.of(user, org)) {
			assertThatApi(() -> actor.adminSports(name)).fails(FORBIDDEN);
			assertThatApi(() -> actor.createSport(uniqueName("Запрещённый "), png, 50, 20, true)).fails(FORBIDDEN);
			assertThatApi(() -> actor.renameSport(created.id(), "Чужая правка")).fails(FORBIDDEN);
			assertThatApi(() -> actor.deleteSport(created.id())).fails(FORBIDDEN);
		}
		assertThat(user.sports(name)).singleElement().satisfies(s -> {
			assertThat(s.id()).isEqualTo(created.id());
			assertThat(s.imageUrl()).isEqualTo(created.imageUrl());
			assertThat(s.imageFocus()).isEqualTo(created.imageFocus());
		});

		// Ошибочные загрузки сохраняют прежнюю картинку.
		for (var invalid : List.of(png(255, 255), png(256, 257), Arrays.copyOf(png, 2 * 1024 * 1024 + 1), new byte[] {1, 2, 3})) {
			assertThatApi(() -> admin.replaceSportImage(created.id(), invalid, 50, 20)).fails(BAD_REQUEST);
		}
		assertThat(user.sports(name)).singleElement().satisfies(s -> assertThat(s.imageUrl()).isEqualTo(created.imageUrl()));
		var replaced = admin.replaceSportImage(created.id(), png(300, 300), 72, 28);
		assertThat(replaced.imageUrl()).matches("/api/files/[0-9a-f-]{36}").isNotEqualTo(created.imageUrl());
		assertThat(user.sports(name)).singleElement().satisfies(s -> {
			assertThat(s.imageUrl()).isEqualTo(replaced.imageUrl());
			assertThat(s.imageFocus()).isEqualTo(new FocusPoint(72, 28));
		});
		var removed = admin.removeSportImage(created.id());
		assertThat(removed.imageUploaded()).isFalse();
		assertThat(removed.hasImage()).isFalse();
		assertThat(user.sports(name)).singleElement().satisfies(s -> {
			assertThat(s.imageUrl()).isEqualTo("/api/sport-images/default.webp");
			assertThat(s.imageFocus()).isEqualTo(new FocusPoint(50, 20));
		});

		var renamed = uniqueName("Кёрлинг на песке ");
		assertThat(admin.renameSport(created.id(), renamed).name()).isEqualTo(renamed);
		assertThat(user.sports(name)).isEmpty();
		assertThat(user.sports(renamed)).extracting(s -> s.id()).containsExactly(created.id());
		var duplicate = "  " + renamed.toUpperCase(Locale.ROOT).replace('Ё', 'Е').replace(" ", "   ") + "  ";
		assertThatApi(() -> admin.createSport(duplicate, null, 50, 20, true)).fails(CONFLICT);
		var draftName = uniqueName("Черновик ");
		var draft = admin.createSport(draftName, null, 50, 20, false);
		assertThat(draft.status()).isEqualTo(SportStatus.HIDDEN);
		assertThat(user.sports(draftName)).isEmpty();
		assertThatApi(() -> admin.renameSport(draft.id(), duplicate)).fails(CONFLICT);
		assertThat(admin.restoreSport(draft.id()).status()).isEqualTo(SportStatus.ACTIVE);
		assertThat(user.sports(draftName)).extracting(s -> s.id()).containsExactly(draft.id());
	}

	/**
	 * ФЛОУ: пользователь предлагает виды через мероприятия; админ одобряет один и отклоняет другой с причиной.
	 * ШАГИ:
	 *   1. Создать две встречи со своими видами, проверить PENDING и видимость обоих в поиске.
	 *   2. Одобрить первый вид; второй скрыть с причиной и проверить решение в админке.
	 *   3. Попробовать создать встречу со скрытым видом по имени и id, открыть прежнее событие и ленту.
	 *   4. Восстановить вид, проверить очистку причины, поиск и новую публикацию с прежним id вида.
	 * ПРОВЕРЯЕМ: PENDING → ACTIVE и PENDING → HIDDEN → ACTIVE, причина отказа, 400 при повторном
	 *   использовании скрытого вида; старое событие остаётся PUBLISHED и доступно другому человеку.
	 * ПОЧЕМУ ВАЖНО: отклонение вида должно остановить новые публикации, сохранив уже назначенные встречи.
	 */
	@Test
	void customSportModerationPreservesExistingEventsAndCanBeRestored() {
		var admin = api.newAdmin();
		var author = api.newUser("sportAuthor");
		var reader = api.newUser("sportViewer");
		var approvedName = uniqueName("Ледовый петанк ");
		var rejectedName = uniqueName("Лунный петанк ");
		var approvedEvent = author.createEvent(EventForm.free().sport(approvedName));
		var oldEvent = author.createEvent(EventForm.free().sport(rejectedName));
		for (var name : List.of(approvedName, rejectedName)) {
			assertThat(adminSport(admin, name).status()).isEqualTo(SportStatus.PENDING);
			assertThat(reader.sports(name)).hasSize(1);
		}
		assertThat(admin.approveSport(approvedEvent.sport().id()).status()).isEqualTo(SportStatus.ACTIVE);
		assertThat(adminSport(admin, approvedName).status()).isEqualTo(SportStatus.ACTIVE);
		assertThat(reader.sports(approvedName)).extracting(s -> s.id()).containsExactly(approvedEvent.sport().id());

		var reason = "Название не относится к спортивной активности";
		var hidden = admin.hideSport(oldEvent.sport().id(), reason);
		assertThat(hidden.status()).isEqualTo(SportStatus.HIDDEN);
		assertThat(adminSport(admin, rejectedName).moderationReason()).isEqualTo(reason);
		assertThat(reader.sports(rejectedName)).isEmpty();
		assertThatApi(() -> author.createEvent(EventForm.free().sport(rejectedName))).fails(BAD_REQUEST,
				"Вид спорта «" + rejectedName + "» отключён администратором");
		assertThatApi(() -> author.createEvent(EventForm.free().sportId(oldEvent.sport().id()))).fails(BAD_REQUEST);
		var card = reader.openEvent(oldEvent.id());
		assertThat(card.status()).isEqualTo(EventStatus.PUBLISHED);
		assertThat(card.sport().id()).isEqualTo(oldEvent.sport().id());
		assertThat(reader.search(oldEvent.title())).extracting(e -> e.id()).containsExactly(oldEvent.id());

		var restored = admin.restoreSport(hidden.id());
		assertThat(restored.status()).isEqualTo(SportStatus.ACTIVE);
		assertThat(restored.moderationReason()).isNull();
		assertThat(reader.sports(rejectedName)).extracting(s -> s.id()).containsExactly(hidden.id());
		assertThat(author.createEvent(EventForm.free().sport(rejectedName)).sport().id()).isEqualTo(hidden.id());
	}

	/**
	 * ФЛОУ: админ объединяет два используемых вида без потери мероприятий и интересов, удаляет пустой вид.
	 * ШАГИ:
	 *   1. Создать два вида и по событию на каждый; одному человеку выбрать оба вида, другому только исходный.
	 *   2. Отклонить слияние с собой и со скрытым видом; проверить запрет удаления используемого вида.
	 *   3. Объединить исходный с целевым; перечитать карточки, интересы, счётчики и публичный поиск.
	 *   4. Создать событие по старому имени, проверить целевой вид и рост счётчика.
	 *   5. Удалить неиспользуемый вид, проверить отсутствие в справочниках и повторное удаление — 404.
	 * ПРОВЕРЯЕМ: 400/409 для недопустимых действий; MERGED, перенос событий и интересов,
	 *   единственный интерес при пересечении, сохранение уровня целевого, отсутствие исходного в поиске.
	 * ПОЧЕМУ ВАЖНО: устранение дубля не должно разбивать поиск встреч, терять интересы или оставлять битые ссылки.
	 */
	@Test
	void mergeMovesEventsAndDeduplicatesInterestsWhileDeletionProtectsUsedSports() {
		var admin = api.newAdmin();
		var author = api.newUser("mergeAuthor");
		var fan = api.newUser("mergeFan");
		var source = admin.createSport(uniqueName("Исходный "), null, 50, 20, true);
		var target = admin.createSport(uniqueName("Целевой "), null, 50, 20, true);
		var unused = admin.createSport(uniqueName("Неиспользуемый "), null, 50, 20, false);
		var first = author.createEvent(EventForm.free().sportId(source.id()));
		var second = author.createEvent(EventForm.free().sportId(target.id()));
		author.saveMySports(new SaveUserSportsRequest(List.of(
				new UserSportRequest(source.id(), null, SportLevel.BEGINNER),
				new UserSportRequest(target.id(), null, SportLevel.PRO))));
		fan.saveMySports(new SaveUserSportsRequest(List.of(new UserSportRequest(source.id(), null, SportLevel.AMATEUR))));
		assertThat(adminSport(admin, target.name()).eventsCount()).isEqualTo(1);
		assertThatApi(() -> admin.mergeSport(source.id(), source.id())).fails(BAD_REQUEST, "Нельзя объединить вид с самим собой");
		assertThatApi(() -> admin.mergeSport(source.id(), unused.id())).fails(CONFLICT);
		assertThatApi(() -> admin.deleteSport(source.id())).fails(CONFLICT);

		var merged = admin.mergeSport(source.id(), target.id());
		assertThat(merged.status()).isEqualTo(SportStatus.MERGED);
		assertThat(merged.mergedIntoName()).isEqualTo(target.name());
		assertThat(adminSport(admin, source.name()).eventsCount()).isZero();
		assertThat(adminSport(admin, source.name()).status()).isEqualTo(SportStatus.MERGED);
		assertThat(adminSport(admin, target.name()).eventsCount()).isEqualTo(2);
		assertThat(author.openEvent(first.id()).sport().id()).isEqualTo(target.id());
		assertThat(author.openEvent(second.id()).sport().id()).isEqualTo(target.id());
		assertThat(author.mySports()).singleElement().satisfies(s -> {
			assertThat(s.sport().id()).isEqualTo(target.id());
			assertThat(s.level()).isEqualTo(SportLevel.PRO);
		});
		assertThat(fan.mySports()).singleElement().satisfies(s -> {
			assertThat(s.sport().id()).isEqualTo(target.id());
			assertThat(s.level()).isEqualTo(SportLevel.AMATEUR);
		});
		assertThat(fan.sports(source.name())).isEmpty();
		assertThat(fan.sports(target.name())).extracting(s -> s.id()).containsExactly(target.id());
		assertThat(author.createEvent(EventForm.free().sport(source.name())).sport().id()).isEqualTo(target.id());
		assertThat(adminSport(admin, target.name()).eventsCount()).isEqualTo(3);
		assertThatApi(() -> admin.deleteSport(target.id())).fails(CONFLICT);

		// Пустой вид действительно удаляется, а не просто скрывается.
		admin.restoreSport(unused.id());
		assertThat(fan.sports(unused.name())).hasSize(1);
		admin.deleteSport(unused.id());
		assertThat(admin.adminSports(unused.name()).items()).isEmpty();
		assertThat(fan.sports(unused.name())).isEmpty();
		assertThatApi(() -> admin.deleteSport(unused.id())).fails(NOT_FOUND);
	}

	private AdminSportResponse adminSport(Actor admin, String name) {
		var matches = admin.adminSports(name).items();
		assertThat(matches).hasSize(1);
		return matches.getFirst();
	}

	private static byte[] png(int width, int height) throws IOException {
		var output = new ByteArrayOutputStream();
		assertThat(ImageIO.write(new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB), "png", output)).isTrue();
		return output.toByteArray();
	}
}
