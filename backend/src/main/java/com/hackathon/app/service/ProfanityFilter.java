package com.hackathon.app.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

import com.hackathon.app.domain.enums.ModerationCategory;
import com.hackathon.app.util.TextNormalizer;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Словарная проверка текста без нейросети: мгновенно, на каждый запрос. Нецензурное (moderation/obscene.txt)
 * не даём сохранить; грубость (moderation/rude.txt) и признаки спама пропускаем, но сразу ставим в очередь
 * администратора. moderation/allowlist.txt — обычные слова, похожие на корни из словарей.
 */
@Component
public class ProfanityFilter {

	/** Что нашлось: вид нарушения и слово (как в нормализованном тексте) для пояснения админу. */
	public record Finding(ModerationCategory category, String fragment) {}

	private static final String BEFORE = "(?<![\\p{L}\\p{N}])(";
	private static final String AFTER = ")(?![\\p{L}\\p{N}])";
	private static final int FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS;

	private static final Pattern LINK = Pattern.compile(
			"(?:https?://|www\\.|t\\.me/|wa\\.me/|vk\\.(?:com|cc)/|bit\\.ly/|@[a-z0-9_]{5,})", FLAGS);
	private static final Pattern PHONE = Pattern.compile("(?:\\+7|8)[\\s(\\-]*\\d{3}[\\s)\\-]*\\d{3}[\\s\\-]*\\d{2}[\\s\\-]*\\d{2}");
	private static final Pattern PROMO = Pattern.compile(BEFORE + String.join("|",
			"заработ\\p{L}*", "доход\\p{L}*", "казино", "ставк\\p{L}*", "букмекер\\p{L}*", "крипт\\p{L}*",
			"инвестиц\\p{L}*", "промокод\\p{L}*", "скидк\\p{L}*", "акци[яи]", "подпис[ыа]\\p{L}*", "переходи\\p{L}*",
			"пиши(?:те)?", "в\\s+(?:лс|личку)", "бесплатн\\p{L}*", "прода[мюеё]\\p{L}*", "купи(?:те)?") + AFTER, FLAGS);

	private final Pattern obscene;
	private final Pattern rude;
	private final Pattern allowed;

	public ProfanityFilter() {
		obscene = words(load("moderation/obscene.txt"));
		rude = words(load("moderation/rude.txt"));
		allowed = Pattern.compile("^(?:" + String.join("|", load("moderation/allowlist.txt")) + ")$", FLAGS);
	}

	/** Первое нецензурное слово; пусто — текст можно сохранять. */
	public Optional<String> obscene(String text) {
		return first(obscene, text);
	}

	/**
	 * Мягкие признаки: грубость (во всех текстах) и спам (spamRules — только в сообщениях обсуждения,
	 * ведь в описании мероприятия ссылки и телефоны уместны). Текст сохраняется, но идёт к администратору.
	 */
	public List<Finding> softSignals(String text, boolean spamRules) {
		var out = new ArrayList<Finding>();
		first(rude, text).ifPresent(word -> out.add(new Finding(ModerationCategory.INSULT, word)));
		if (spamRules && text != null) {
			long links = LINK.matcher(text).results().count() + PHONE.matcher(text).results().count();
			var promo = PROMO.matcher(text);
			boolean hasPromo = promo.find();
			if (links >= 2 || (links >= 1 && hasPromo)) {
				out.add(new Finding(ModerationCategory.SPAM, hasPromo ? promo.group() : "ссылки и контакты"));
			}
		}
		return out;
	}

	/** Категории мягких признаков без повторов. */
	public static Set<ModerationCategory> categories(List<Finding> findings) {
		var set = EnumSet.noneOf(ModerationCategory.class);
		findings.forEach(f -> set.add(f.category()));
		return set;
	}

	private Optional<String> first(Pattern dictionary, String text) {
		for (var variant : TextNormalizer.variants(text)) {
			var m = dictionary.matcher(variant);
			while (m.find()) {
				if (!allowed.matcher(m.group()).matches()) {
					return Optional.of(m.group());
				}
			}
		}
		return Optional.empty();
	}

	private static Pattern words(List<String> roots) {
		return Pattern.compile(BEFORE + String.join("|", roots) + AFTER, FLAGS);
	}

	/** Строки словаря без пустых и комментариев (#). */
	private static List<String> load(String path) {
		try (var in = new ClassPathResource(path).getInputStream()) {
			return new String(in.readAllBytes(), StandardCharsets.UTF_8).lines()
					.map(String::strip)
					.filter(l -> !l.isEmpty() && !l.startsWith("#"))
					.toList();
		}
		catch (IOException e) {
			throw new UncheckedIOException("Не найден словарь модерации " + path, e);
		}
	}
}
