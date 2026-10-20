package com.hackathon.app.service;

import static com.hackathon.app.domain.enums.ModerationCategory.INSULT;
import static com.hackathon.app.domain.enums.ModerationCategory.SPAM;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class ProfanityFilterTest {
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
