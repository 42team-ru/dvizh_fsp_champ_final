package com.hackathon.app.service;

import static com.hackathon.app.domain.enums.ModerationCategory.INSULT;
import static com.hackathon.app.domain.enums.ModerationCategory.SEXUAL;
import static com.hackathon.app.domain.enums.ModerationCategory.SPAM;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Locale;

import org.junit.jupiter.api.Test;

class ProfanityFilterTest {
	/**
	 * ФЛОУ: словарь отмечает сексуальную лексику и денежную рекламу с контактом для модерации.
	 * ШАГИ: 1. Проверить сексуальное слово в сообщении и описании события.
	 *   2. Проверить заработок, ставки и казино с призывами написать, перейти или открыть профиль,
	 *   а также заработок со ссылкой. 3. Сравнить с обычными ссылками без денежной рекламы.
	 * ПРОВЕРЯЕМ: сексуальное слово даёт ровно SEXUAL/2 с найденным фрагментом;
	 *   денежная реклама даёт ровно SPAM/3 только при spamRules=true, обычные ссылки — SPAM/1.
	 * ПОЧЕМУ ВАЖНО: серьёзность словарного сигнала определяет дальнейшее автоматическое скрытие,
	 *   а допустимые ссылки в описании события не должны становиться рекламным нарушением.
	 */
	@Test
	void assignsSeverityToSexualVocabularyAndMoneyAdsWithContact() {
		var filter = new ProfanityFilter();
		var sexualWord = "\u0442\u0440\u0430\u0445\u0430\u044e\u0441\u044c";
		for (var spamRules : List.of(true, false)) {
			assertThat(filter.softSignals(sexualWord, spamRules))
					.containsExactly(new ProfanityFilter.Finding(SEXUAL, sexualWord, 2));
		}
		for (var promo : List.of("Заработок — пиши в лс", "Ставки — пишите в личку",
				"Казино — ссылка в профиле", "Казино — переходи", "Заработок https://example.com/offer")) {
			assertThat(filter.softSignals(promo, true)).as("денежная реклама: %s", promo)
					.singleElement().satisfies(finding -> {
						assertThat(finding.category()).isEqualTo(SPAM);
						assertThat(finding.severity()).isEqualTo(3);
						assertThat(finding.fragment())
								.isEqualTo(promo.substring(0, promo.indexOf(' ')).toLowerCase(Locale.ROOT));
					});
			assertThat(filter.softSignals(promo, false)).as("описание события: %s", promo).isEmpty();
		}
		assertThat(filter.softSignals("https://example.com https://example.org", true))
				.containsExactly(new ProfanityFilter.Finding(SPAM, "ссылки и контакты", 1));
	}

	/**
	 * ФЛОУ: участники свободно обсуждают спорт и продают экипировку без ложных сигналов модерации.
	 * ШАГИ: 1. Проверить похожие на словарную лексику медицинское и музыкальные выражения.
	 *   2. Проверить сообщение о ставках без контакта. 3. Проверить продажу бутс с контактом без денег-приманок.
	 * ПРОВЕРЯЕМ: ни один пример не блокируется строгим словарём и не даёт мягких сигналов
	 *   даже при включённых правилах спама для сообщений.
	 * ПОЧЕМУ ВАЖНО: похожие корни и отдельные рекламные признаки не должны отправлять
	 *   обычные сообщения участников в очередь нарушений.
	 */
	@Test
	void ignoresSimilarWordsAndMoneyOrContactWithoutTheirCombination() {
		var filter = new ProfanityFilter();
		for (var text : List.of("трахеит", "секстет", "виртуозная игра",
				"Ставки сделаны, ждём матч в 19:00", "Продаю бутсы, пишите в личку")) {
			assertThat(filter.obscene(text)).as("обычная речь: %s", text).isEmpty();
			assertThat(filter.softSignals(text, true)).as("обычная речь: %s", text).isEmpty();
		}
	}

	/**
	 * ФЛОУ: словарь распознаёт замаскированную брань, сохраняя обычную спортивную речь.
	 * ШАГИ: 1. Проверить гомоглифы, разделители, повторы, маску и цифру вместо буквы.
	 *   2. Проверить похожие обычные слова. 3. Сравнить мягкие сигналы обсуждения и описания события.
	 * ПРОВЕРЯЕМ: брань найдена во всех вариантах; обычные слова не дают ни блокировки, ни грубости;
	 *   грубость даёт INSULT, реклама со ссылкой — SPAM только при включённых правилах обсуждения.
	 * ПОЧЕМУ ВАЖНО: обход словаря не должен пропускать нарушения, а ложные совпадения мешать общению.
	 */
	@Test
	void detectsObfuscationWithoutBlockingOrdinaryWordsAndSeparatesSoftSignals() {
		var filter = new ProfanityFilter();
		for (var text : List.of("xy\u0439", "\u0445.\u0443.\u0439", "\u0445\u0443\u0443\u0443\u0443\u0439",
				"\u0431\u043b*\u0442\u044c", "e6\u0430\u0442\u044c")) {
			assertThat(filter.obscene(text)).as("замаскированная брань: %s", text).isPresent();
		}
		for (var text : List.of("\u043f\u043b\u043e\u0445\u0443\u044e", "\u0442\u0438\u0445\u0443\u044e",
				"\u0441\u0443\u0445\u0443\u044e", "\u043f\u0441\u0438\u0445\u0443\u0439",
				"\u0437\u0430\u0441\u0442\u0440\u0430\u0445\u0443\u0439\u0441\u044f", "употреблять", "оскорблять",
				"небо", "колебания", "хуже", "похудеть", "даунхилл")) {
			assertThat(filter.obscene(text)).as("обычное слово: %s", text).isEmpty();
			assertThat(filter.softSignals(text, true)).as("обычное слово: %s", text).isEmpty();
		}
		assertThat(ProfanityFilter.categories(filter.softSignals("Ты лох", false))).containsExactly(INSULT);
		var promo = "Заработок https://example.com/offer";
		assertThat(ProfanityFilter.categories(filter.softSignals(promo, true))).containsExactly(SPAM);
		assertThat(filter.softSignals(promo, false)).isEmpty();
		assertThat(ProfanityFilter.categories(filter.softSignals("https://example.com https://example.org", true)))
				.containsExactly(SPAM);
		assertThat(ProfanityFilter.categories(filter.softSignals("+7 900 111-22-33 и +7 900 444-55-66", true)))
				.containsExactly(SPAM);
	}
}
