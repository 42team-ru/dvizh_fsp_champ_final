package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.ModerationCategory.*;
import static com.hackathon.app.domain.enums.ModerationDecision.APPROVED;
import static com.hackathon.app.domain.enums.ModerationSource.HEURISTIC;
import static com.hackathon.app.domain.enums.ModerationStatus.*;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.util.Map;

import com.hackathon.app.domain.dto.UpdateProfileRequest;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class TextModerationE2ETest {
	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;

	/**
	 * ФЛОУ: без нейросети брань отклоняется до сохранения, а грубость и реклама поступают администратору.
	 * ШАГИ: 1. Создать событие и обычный комментарий; отклонить брань при отправке, правке, заполнении
	 *   профиля и описания события. 2. Отправить грубость и рекламу, проверить очередь и приватность оценки.
	 *   3. Проверить запрет очереди для USER и повторной оценки без модели; одобрить грубость.
	 *   4. Удалить рекламное сообщение автором и перечитать очередь и счётчик.
	 * ПРОВЕРЯЕМ: точные 400 и неизменность сохранённых текстов; FLAGGED/HEURISTIC с INSULT или SPAM;
	 *   оценка доступна только ADMIN; 403 и 409; одобрение даёт RESOLVED/APPROVED, удаление отзывает проверку.
	 * ПОЧЕМУ ВАЖНО: модерация работает без внешней модели, не теряет допустимые сообщения и не оставляет
	 *   администратору уже разобранные либо удалённые тексты.
	 */
	@Test
	void rejectsObsceneChangesAndManagesHeuristicQueueWithoutLlm() {
		var api = new TestApi(mvc, json, users, passwords);
		var author = api.newUser("textAuthor");
		var reader = api.newUser("textReader");
		var admin = api.newAdmin();
		var event = author.createEvent(EventForm.free());
		var ordinary = author.comment(event.id(), "Когда встречаемся?");
		var before = reader.comments(event.id());
		var obscene = "\u0445\u0443\u0439";
		var rejected = "Сообщение не отправлено: уберите нецензурные слова";

		// Ошибочные изменения не затрагивают сохранённые данные.
		assertThatApi(() -> author.comment(event.id(), obscene)).fails(BAD_REQUEST, rejected);
		assertThat(reader.comments(event.id())).isEqualTo(before);
		assertThatApi(() -> author.editComment(event.id(), ordinary.id(), obscene)).fails(BAD_REQUEST, rejected);
		assertThat(reader.comments(event.id())).isEqualTo(before);
		var profile = reader.openUser(author.id());
		assertThatApi(() -> author.updateProfile(new UpdateProfileRequest("Анна", "Иванова", "Красноярск", obscene)))
				.fails(BAD_REQUEST, "Уберите нецензурные слова из поля «О себе»");
		assertThat(reader.openUser(author.id())).isEqualTo(profile);
		var badEvent = EventForm.free().description(obscene);
		assertThatApi(() -> author.createEvent(badEvent)).fails(BAD_REQUEST, "Уберите нецензурные слова из поля «Описание»");
		assertThat(author.myEvents()).extracting(e -> e.id()).containsExactly(event.id());

		// Словарь сохраняет мягкие нарушения и даёт администратору объяснение.
		long initialQueue = admin.adminStats().moderationQueue();
		var rude = author.comment(event.id(), "Ты лох");
		var spam = author.comment(event.id(), "Заработок https://example.com/offer");
		var queue = admin.moderationQueue(Map.of("targetType", "COMMENT", "size", "100")).items();
		var rudeCheck = queue.stream().filter(c -> c.targetId().equals(rude.id())).findFirst().orElseThrow();
		var spamCheck = queue.stream().filter(c -> c.targetId().equals(spam.id())).findFirst().orElseThrow();
		assertThat(rudeCheck.status()).isEqualTo(FLAGGED);
		assertThat(rudeCheck.source()).isEqualTo(HEURISTIC);
		assertThat(rudeCheck.categories()).containsExactly(INSULT);
		assertThat(rudeCheck.text()).isEqualTo(rude.text());
		assertThat(spamCheck.status()).isEqualTo(FLAGGED);
		assertThat(spamCheck.source()).isEqualTo(HEURISTIC);
		assertThat(spamCheck.categories()).containsExactly(SPAM);
		assertThat(admin.adminStats().moderationQueue()).isEqualTo(initialQueue + 2);
		assertThat(reader.comments(event.id())).allSatisfy(c -> assertThat(c.moderation()).isNull());
		assertThat(admin.comments(event.id())).filteredOn(c -> c.id().equals(rude.id())).singleElement().satisfies(c -> {
			assertThat(c.moderation().checkId()).isEqualTo(rudeCheck.id());
			assertThat(c.moderation().status()).isEqualTo(FLAGGED);
		});
		assertThatApi(() -> reader.moderationQueue(Map.of())).fails(FORBIDDEN);
		assertThatApi(() -> admin.recheckModeration(rudeCheck.id())).fails(CONFLICT,
				"Нейросеть выключена: включите MODERATION_LLM_ENABLED");

		// Решённое и удалённое уходят из очереди, но различаются в истории проверок.
		var approved = admin.approveModeration(rudeCheck.id());
		assertThat(approved.status()).isEqualTo(RESOLVED);
		assertThat(approved.decision()).isEqualTo(APPROVED);
		assertThat(admin.moderationQueue(Map.of("status", "RESOLVED", "size", "100")).items())
				.extracting(c -> c.id()).contains(rudeCheck.id());
		author.deleteComment(event.id(), spam.id());
		assertThat(admin.moderationQueue(Map.of("size", "100")).items()).extracting(c -> c.id())
				.doesNotContain(rudeCheck.id(), spamCheck.id());
		assertThat(admin.moderationQueue(Map.of("status", "FLAGGED", "size", "100")).items())
				.extracting(c -> c.id()).doesNotContain(spamCheck.id());
		assertThat(admin.adminStats().moderationQueue()).isEqualTo(initialQueue);
		assertThat(reader.comments(event.id())).filteredOn(c -> c.id().equals(rude.id())).singleElement()
				.satisfies(c -> assertThat(c.text()).isEqualTo(rude.text()));
	}
}
