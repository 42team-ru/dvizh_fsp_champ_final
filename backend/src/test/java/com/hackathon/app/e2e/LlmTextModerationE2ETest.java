package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.ModerationCategory.*;
import static com.hackathon.app.domain.enums.ModerationDecision.*;
import static com.hackathon.app.domain.enums.ModerationSource.LLM;
import static com.hackathon.app.domain.enums.ModerationStatus.*;
import static com.hackathon.app.domain.enums.ModerationTarget.*;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.http.HttpStatus.CONFLICT;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import com.hackathon.app.config.ModerationProperties;
import com.hackathon.app.domain.dto.ModerationItemResponse;
import com.hackathon.app.domain.dto.UpdateProfileRequest;
import com.hackathon.app.domain.enums.ModerationTarget;
import com.hackathon.app.e2e.support.Actor;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.OrganizationForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.service.LlmModerationClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"app.moderation.llm.enabled=true",
		"spring.datasource.url=jdbc:h2:mem:llm_moderation;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"})
@AutoConfigureMockMvc
@ActiveProfiles("h2")
@Import(LlmTextModerationE2ETest.StubConfiguration.class)
class LlmTextModerationE2ETest {
	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;

	/**
	 * ФЛОУ: фоновая модель скрывает угрозу и подтверждённую словарём рекламу, а сомнительные тексты
	 *   передаёт администратору.
	 * ШАГИ: 1. Отправить угрозу и дождаться оценки через очередь; сравнить видимость у читателя и автора.
	 *   2. Одобрить сообщение и проверить восстановление. 3. Подать сомнительную анкету и попробовать
	 *   скрыть её. 4. Сохранить сомнительный профиль, дождаться оценки и очистить его администратором.
	 *   5. Отправить рекламу со словарными признаками и без них при одинаковом вердикте модели.
	 * ПРОВЕРЯЕМ: AUTO_HIDDEN/LLM/THREAT и причина автору; одобрение возвращает текст; анкета FLAGGED
	 *   без скрытия, попытка скрыть её даёт 409; очистка профиля даёт RESOLVED и публичное bio=null;
	 *   словарь вместе с LLM/SPAM/severity=2 скрывает рекламу с точной причиной, одна модель — только FLAGGED.
	 * ПОЧЕМУ ВАЖНО: опасный текст быстро исчезает из обсуждения, а обратимые решения и разные меры
	 *   для сообщений, анкет и профилей сохраняют администратору контроль над ошибками модели.
	 *   Одной оценки модели недостаточно для скрытия обычного сообщения как рекламы.
	 */
	@Test
	void autoHidesThreatAndAllowsAdminToApproveOrClearFlaggedContent() {
		var api = new TestApi(mvc, json, users, passwords);
		var author = api.newUser("llmAuthor");
		var reader = api.newUser("llmReader");
		var admin = api.newAdmin();
		var event = author.createEvent(EventForm.free());
		// Фоновая оценка меняет видимость только после коммита.
		var threat = author.comment(event.id(), "threat-marker: Я тебе угрожаю");
		var check = awaitFlagged(admin, COMMENT, threat.id());
		assertThat(check.status()).isEqualTo(AUTO_HIDDEN);
		assertThat(check.source()).isEqualTo(LLM);
		assertThat(check.categories()).containsExactly(THREAT);
		assertThat(check.severity()).isEqualTo(3);
		assertThat(check.hidden()).isTrue();
		assertThat(reader.comments(event.id())).singleElement().satisfies(c -> {
			assertThat(c.hidden()).isTrue();
			assertThat(c.text()).isNull();
			assertThat(c.hiddenReason()).isNull();
			assertThat(c.moderation()).isNull();
		});
		assertThat(author.comments(event.id())).singleElement().satisfies(c ->
				assertThat(c.hiddenReason()).startsWith("Скрыто автоматически"));
		assertThat(admin.comments(event.id())).singleElement().satisfies(c ->
				assertThat(c.moderation().status()).isEqualTo(AUTO_HIDDEN));
		// Администратор возвращает автоматически скрытый текст.
		var approved = admin.approveModeration(check.id());
		assertThat(approved.status()).isEqualTo(RESOLVED);
		assertThat(approved.decision()).isEqualTo(APPROVED);
		assertThat(approved.hidden()).isFalse();
		assertThat(reader.comments(event.id())).singleElement().satisfies(c -> {
			assertThat(c.hidden()).isFalse();
			assertThat(c.text()).isEqualTo(threat.text());
			assertThat(c.hiddenReason()).isNull();
		});

		// Анкета остаётся доступной модератору без автоматического скрытия.
		var organization = api.newOrganization("llmClub").submitOrganization(OrganizationForm.valid()
				.description("suspicious-marker: Спортивный клуб с сомнительным описанием"));
		var questionnaire = awaitFlagged(admin, ORGANIZATION, organization.id());
		assertThat(questionnaire.status()).isEqualTo(FLAGGED);
		assertThat(questionnaire.source()).isEqualTo(LLM);
		assertThat(questionnaire.hidden()).isFalse();
		assertThatApi(() -> admin.hideModeration(questionnaire.id(), "Проверить описание")).fails(CONFLICT,
				"Скрыть можно только сообщение. Мероприятие снимите с публикации, анкету верните на доработку");
		assertThat(admin.recheckModeration(questionnaire.id()).status()).isEqualTo(FLAGGED);

		// Очистка профиля видна другому пользователю при повторном чтении.
		author.updateProfile(new UpdateProfileRequest("Анна", "Иванова", "Красноярск", "suspicious-marker: О себе"));
		var profile = awaitFlagged(admin, USER_PROFILE, author.id());
		assertThat(profile.status()).isEqualTo(FLAGGED);
		assertThat(reader.openUser(author.id()).bio()).isEqualTo("suspicious-marker: О себе");
		var cleared = admin.clearProfileModeration(profile.id());
		assertThat(cleared.status()).isEqualTo(RESOLVED);
		assertThat(cleared.decision()).isEqualTo(ACTION_TAKEN);
		assertThat(reader.openUser(author.id()).bio()).isNull();
		assertThat(admin.moderationQueue(Map.of("size", "100")).items()).extracting(c -> c.id())
				.doesNotContain(check.id(), profile.id()).contains(questionnaire.id());

		// Реклама скрывается при совпадении словарного сигнала и оценки модели на пороге severity=2.
		var dictionarySpam = author.comment(event.id(), "spam-marker: Заработок — пиши в лс t.me/x");
		var spamCheck = awaitFlagged(admin, COMMENT, dictionarySpam.id());
		assertThat(spamCheck.status()).isEqualTo(AUTO_HIDDEN);
		assertThat(spamCheck.source()).isEqualTo(LLM);
		assertThat(spamCheck.categories()).containsExactly(SPAM);
		assertThat(spamCheck.severity()).isEqualTo(2);
		assertThat(spamCheck.hidden()).isTrue();
		assertThat(reader.comments(event.id())).filteredOn(c -> c.id().equals(dictionarySpam.id()))
				.singleElement().satisfies(c -> {
					assertThat(c.hidden()).isTrue();
					assertThat(c.text()).isNull();
					assertThat(c.hiddenReason()).isNull();
				});
		assertThat(author.comments(event.id())).filteredOn(c -> c.id().equals(dictionarySpam.id()))
				.singleElement().satisfies(c ->
						assertThat(c.hiddenReason()).isEqualTo("Скрыто автоматически: реклама"));

		// Тот же вердикт без ссылок и рекламных слов оставляет сообщение видимым.
		var modelOnlySpam = author.comment(event.id(), "spam-marker: Сообщение о тренировке");
		var modelOnlyCheck = awaitFlagged(admin, COMMENT, modelOnlySpam.id());
		assertThat(modelOnlyCheck.status()).isEqualTo(FLAGGED);
		assertThat(modelOnlyCheck.source()).isEqualTo(LLM);
		assertThat(modelOnlyCheck.categories()).containsExactly(SPAM);
		assertThat(modelOnlyCheck.severity()).isEqualTo(2);
		assertThat(modelOnlyCheck.hidden()).isFalse();
		assertThat(reader.comments(event.id())).filteredOn(c -> c.id().equals(modelOnlySpam.id()))
				.singleElement().satisfies(c -> {
					assertThat(c.hidden()).isFalse();
					assertThat(c.text()).isEqualTo(modelOnlySpam.text());
					assertThat(c.hiddenReason()).isNull();
				});
	}

	/** Опрос реального API до завершения фоновой транзакции, без фиксированной задержки. */
	private ModerationItemResponse awaitFlagged(Actor admin, ModerationTarget target, UUID id) {
		var result = new AtomicReference<ModerationItemResponse>();
		await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(25)).untilAsserted(() -> {
			var items = admin.moderationQueue(Map.of("targetType", target.name(), "size", "100")).items();
			assertThat(items).filteredOn(c -> c.targetId().equals(id)).singleElement().satisfies(result::set);
		});
		return result.get();
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class StubConfiguration {
		@Bean
		@Primary
		LlmModerationClient deterministicModeration(ModerationProperties properties, ObjectMapper json) {
			return new LlmModerationClient(properties, json) {
				@Override
				public boolean enabled() { return true; }

				@Override
				public Optional<Verdict> classify(String text) {
					if (text.contains("threat-marker")) {
						return Optional.of(new Verdict("violation", Set.of(THREAT), 3, "Угроза участнику"));
					}
					if (text.contains("spam-marker")) {
						return Optional.of(new Verdict("violation", Set.of(SPAM), 2, "Реклама"));
					}
					if (text.contains("suspicious-marker")) {
						return Optional.of(new Verdict("suspicious", Set.of(OTHER), 1, "Нужна проверка человека"));
					}
					return Optional.of(new Verdict("ok", Set.of(), 0, "Нарушений нет"));
				}
			};
		}
	}
}
