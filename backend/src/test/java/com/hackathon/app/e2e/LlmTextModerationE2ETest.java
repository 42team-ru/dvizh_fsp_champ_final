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
import com.hackathon.app.service.ToxicityClient;
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
	 * ФЛОУ: нейросеть вместе со словарём скрывает угрозу и рекламу, а сомнительные тексты
	 *   передаёт администратору.
	 * ШАГИ: 1. Отправить угрозу и дождаться оценки через очередь; сравнить видимость у читателя и автора.
	 *   2. Одобрить сообщение и проверить восстановление; отправить угрозу только по оценке нейросети.
	 *   3. Подать сомнительную анкету и попробовать
	 *   скрыть её. 4. Сохранить сомнительный профиль, дождаться оценки и очистить его администратором.
	 *   5. Отправить рекламу со словарными признаками и без них при одинаковом вердикте модели.
	 * ПРОВЕРЯЕМ: AUTO_HIDDEN/LLM/THREAT и причина автору; одобрение возвращает текст; анкета FLAGGED
	 *   без скрытия, попытка скрыть её даёт 409; очистка профиля даёт RESOLVED и публичное bio=null;
	 *   словарь вместе с LLM/SPAM/severity=2 скрывает рекламу с точной причиной;
	 *   одна нейросеть даёт только FLAGGED для угрозы и рекламы, читатель видит исходный текст.
	 * ПОЧЕМУ ВАЖНО: опасный текст быстро исчезает из обсуждения, а обратимые решения и разные меры
	 *   для сообщений, анкет и профилей сохраняют администратору контроль над ошибками модели.
	 *   Одной оценки модели недостаточно для автоматического скрытия сообщения.
	 */
	@Test
	void autoHidesThreatAndAllowsAdminToApproveOrClearFlaggedContent() {
		var api = new TestApi(mvc, json, users, passwords);
		var author = api.newUser("llmAuthor");
		var reader = api.newUser("llmReader");
		var admin = api.newAdmin();
		var event = author.createEvent(EventForm.free());
		// Фоновая оценка меняет видимость только после коммита.
		var threatWord = "\u0443\u0431\u044c\u044e";
		var threat = author.comment(event.id(), "threat-marker: " + threatWord);
		var check = awaitFlagged(admin, COMMENT, threat.id());
		assertThat(check.status()).isEqualTo(AUTO_HIDDEN);
		assertThat(check.source()).isEqualTo(LLM);
		assertThat(check.categories()).containsExactly(THREAT);
		assertThat(check.severity()).isEqualTo(3);
		assertThat(check.explanation()).startsWith("Словарь:").contains(threatWord, "Нейросеть:");
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

		// Без словарного подтверждения даже THREAT/3 оставляет текст видимым до решения администратора.
		var modelOnlyThreat = author.comment(event.id(), "threat-marker: Сообщение о тренировке");
		var modelOnlyThreatCheck = awaitFlagged(admin, COMMENT, modelOnlyThreat.id());
		assertThat(modelOnlyThreatCheck.status()).isEqualTo(FLAGGED);
		assertThat(modelOnlyThreatCheck.source()).isEqualTo(LLM);
		assertThat(modelOnlyThreatCheck.categories()).containsExactly(THREAT);
		assertThat(modelOnlyThreatCheck.severity()).isEqualTo(3);
		assertThat(modelOnlyThreatCheck.hidden()).isFalse();
		assertThat(reader.comments(event.id())).filteredOn(c -> c.id().equals(modelOnlyThreat.id()))
				.singleElement().satisfies(c -> {
					assertThat(c.hidden()).isFalse();
					assertThat(c.text()).isEqualTo(modelOnlyThreat.text());
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

		// Реклама заработка скрывается при совпадении словарного сигнала и оценки модели на пороге severity=2;
		// словарь считает такую рекламу грубой, поэтому итоговая серьёзность — 3.
		var dictionarySpam = author.comment(event.id(), "spam-marker: Заработок — пиши в лс t.me/x");
		var spamCheck = awaitFlagged(admin, COMMENT, dictionarySpam.id());
		assertThat(spamCheck.status()).isEqualTo(AUTO_HIDDEN);
		assertThat(spamCheck.source()).isEqualTo(LLM);
		assertThat(spamCheck.categories()).containsExactly(SPAM);
		assertThat(spamCheck.severity()).isEqualTo(3);
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

	/**
	 * ФЛОУ: сообщение с сексуальной лексикой скрывается, даже когда модель ошибочно называет его угрозой.
	 * ШАГИ: 1. Создать автора, читателя, администратора и событие через тестовый API.
	 *   2. Отправить словарное сексуальное слово с маркером ошибочного ответа THREAT/3.
	 *   3. Дождаться фоновой оценки в очереди администратора. 4. Прочитать обсуждение другим участником.
	 * ПРОВЕРЯЕМ: проверка AUTO_HIDDEN с единственной категорией SEXUAL, серьёзностью 3
	 *   и словарным объяснением; читатель получает скрытое сообщение без исходного текста.
	 * ПОЧЕМУ ВАЖНО: ошибочная категория маленькой модели не должна подменять точное словарное
	 *   нарушение и его причину, а подтверждённый опасный текст должен исчезать из обсуждения.
	 */
	@Test
	void preservesSexualDictionaryCategoryWhenModelIncorrectlyReportsThreat() {
		var api = new TestApi(mvc, json, users, passwords);
		var author = api.newUser("sexualDictionaryAuthor");
		var reader = api.newUser("sexualDictionaryReader");
		var admin = api.newAdmin();
		var event = author.createEvent(EventForm.free());
		// Словарь распознаёт слово, а модель намеренно выбирает непересекающуюся категорию.
		var sexualWord = "\u0442\u0440\u0430\u0445\u0430\u044e\u0441\u044c";
		var message = author.comment(event.id(), "misclassified-marker: " + sexualWord);
		// Ждём именно итоговую оценку: словарная проверка существует ещё до ответа модели.
		await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(25)).untilAsserted(() -> {
			var items = admin.moderationQueue(Map.of("targetType", COMMENT.name(), "size", "100")).items();
			assertThat(items).filteredOn(c -> c.targetId().equals(message.id())).singleElement().satisfies(check -> {
				assertThat(check.status()).isEqualTo(AUTO_HIDDEN);
				assertThat(check.source()).isEqualTo(LLM);
				assertThat(check.categories()).containsExactly(SEXUAL);
				assertThat(check.severity()).isEqualTo(3);
				assertThat(check.explanation()).startsWith("Словарь:").contains(sexualWord);
				assertThat(check.hidden()).isTrue();
			});
		});
		assertThat(reader.comments(event.id())).singleElement().satisfies(comment -> {
			assertThat(comment.id()).isEqualTo(message.id());
			assertThat(comment.hidden()).isTrue();
			assertThat(comment.text()).isNull();
		});
	}

	/**
	 * ФЛОУ: классификатор участвует в решении о скрытии, а оскорбления и сообщения не по теме
	 *   остаются читателю и поступают в очередь администратора.
	 * ШАГИ: 1. Создать автора, читателя, администратора и событие через тестовый API.
	 *   2. Отправить нейтральный для словаря текст с маркерами threat=0.97 и LLM THREAT/3; дождаться оценки.
	 *   3. Отправить текст с маркерами insult=0.9 и LLM INSULT/2; дождаться оценки.
	 *   4. Отправить текст с маркером LLM OFF_TOPIC/suspicious/1 и нейтральной оценкой классификатора.
	 *   5. Прочитать обсуждение другим пользователем и сопоставить видимость трёх сообщений.
	 * ПРОВЕРЯЕМ: два серьёзных голоса без словаря дают AUTO_HIDDEN/THREAT/3 и объяснение обоих источников;
	 *   INSULT/2 и OFF_TOPIC/1 дают FLAGGED без скрытия; источник итоговой оценки — LLM;
	 *   читатель получает пустой текст скрытого сообщения и исходный текст двух остальных.
	 * ПОЧЕМУ ВАЖНО: классификатор подтверждает опасный текст независимо от словаря, но согласие моделей
	 *   об оскорблении и уходе от темы не должно приводить к автоматическому удалению из обсуждения.
	 */
	@Test
	void combinesClassifierAndLlmVotesWithoutHidingInsultsOrOffTopicComments() {
		var api = new TestApi(mvc, json, users, passwords);
		var author = api.newUser("classifierAuthor");
		var reader = api.newUser("classifierReader");
		var admin = api.newAdmin();
		var event = author.createEvent(EventForm.free());

		// Словарных признаков нет: автоскрытие подтверждают только две модели.
		var threat = author.comment(event.id(), "classifier-threat-marker: threat-marker: Сообщение о тренировке");
		var threatCheck = awaitFlagged(admin, COMMENT, threat.id());
		assertThat(threatCheck.status()).isEqualTo(AUTO_HIDDEN);
		assertThat(threatCheck.source()).isEqualTo(LLM);
		assertThat(threatCheck.categories()).containsExactly(THREAT);
		assertThat(threatCheck.severity()).isEqualTo(3);
		assertThat(threatCheck.explanation()).contains("Классификатор: угроза 97%", "Нейросеть:")
				.doesNotContain("Словарь:");
		assertThat(threatCheck.hidden()).isTrue();

		// Два совпадающих мнения об оскорблении не дают серьёзных голосов.
		var insult = author.comment(event.id(), "classifier-insult-marker: insult-marker: Сообщение о тренировке");
		var insultCheck = awaitFlagged(admin, COMMENT, insult.id());
		assertThat(insultCheck.status()).isEqualTo(FLAGGED);
		assertThat(insultCheck.source()).isEqualTo(LLM);
		assertThat(insultCheck.categories()).containsExactly(INSULT);
		assertThat(insultCheck.severity()).isEqualTo(2);
		assertThat(insultCheck.explanation()).contains("Классификатор: оскорбление 90%", "Нейросеть:")
				.doesNotContain("Словарь:");
		assertThat(insultCheck.hidden()).isFalse();

		// Новая категория нейросети сохраняется при нейтральном ответе классификатора.
		var offTopic = author.comment(event.id(), "off-topic-marker: Сообщение о погоде");
		var offTopicCheck = awaitFlagged(admin, COMMENT, offTopic.id());
		assertThat(offTopicCheck.status()).isEqualTo(FLAGGED);
		assertThat(offTopicCheck.source()).isEqualTo(LLM);
		assertThat(offTopicCheck.categories()).containsExactly(OFF_TOPIC);
		assertThat(offTopicCheck.severity()).isEqualTo(1);
		assertThat(offTopicCheck.hidden()).isFalse();

		var comments = reader.comments(event.id());
		assertThat(comments).hasSize(3);
		assertThat(comments).filteredOn(c -> c.id().equals(threat.id())).singleElement().satisfies(c -> {
			assertThat(c.hidden()).isTrue();
			assertThat(c.text()).isNull();
		});
		assertThat(comments).filteredOn(c -> c.id().equals(insult.id())).singleElement().satisfies(c -> {
			assertThat(c.hidden()).isFalse();
			assertThat(c.text()).isEqualTo(insult.text());
		});
		assertThat(comments).filteredOn(c -> c.id().equals(offTopic.id())).singleElement().satisfies(c -> {
			assertThat(c.hidden()).isFalse();
			assertThat(c.text()).isEqualTo(offTopic.text());
		});
	}

	/** Опрос реального API до завершения фоновой транзакции, без фиксированной задержки. */
	private ModerationItemResponse awaitFlagged(Actor admin, ModerationTarget target, UUID id) {
		var result = new AtomicReference<ModerationItemResponse>();
		await().atMost(Duration.ofSeconds(5)).pollInterval(Duration.ofMillis(25)).untilAsserted(() -> {
			var items = admin.moderationQueue(Map.of("targetType", target.name(), "size", "100")).items();
			assertThat(items).filteredOn(c -> c.targetId().equals(id)).singleElement().satisfies(check -> {
				assertThat(check.source()).isEqualTo(LLM);
				result.set(check);
			});
		});
		return result.get();
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class StubConfiguration {
		@Bean
		@Primary
		ToxicityClient deterministicToxicity(ModerationProperties properties, ObjectMapper json) {
			return new ToxicityClient(properties, json) {
				@Override
				public boolean enabled() { return true; }

				@Override
				public Optional<Toxicity> classify(String text) {
					boolean threat = text.contains("classifier-threat-marker:");
					boolean insult = text.contains("classifier-insult-marker:");
					return Optional.of(new Toxicity(Map.of(
							"threat", threat ? 0.97 : 0.01,
							"insult", insult ? 0.9 : 0.01,
							"obscenity", 0.01,
							"dangerous", 0.01,
							"non-toxic", threat || insult ? 0.01 : 0.99)));
				}
			};
		}

		@Bean
		@Primary
		LlmModerationClient deterministicModeration(ModerationProperties properties, ObjectMapper json) {
			return new LlmModerationClient(properties, json) {
				@Override
				public boolean enabled() { return true; }

				@Override
				public Optional<Verdict> classify(String text) {
					if (text.contains("insult-marker:")) {
						return Optional.of(new Verdict("violation", Set.of(INSULT), 2, "Оскорбление участника"));
					}
					if (text.contains("off-topic-marker:")) {
						return Optional.of(new Verdict("suspicious", Set.of(OFF_TOPIC), 1, "Не по теме события"));
					}
					if (text.contains("misclassified-marker:")) {
						return Optional.of(new Verdict("violation", Set.of(THREAT), 3, "Ошибочно распознанная угроза"));
					}
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
