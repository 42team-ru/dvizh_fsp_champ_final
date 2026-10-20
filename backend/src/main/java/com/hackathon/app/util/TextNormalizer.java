package com.hackathon.app.util;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import lombok.experimental.UtilityClass;

/**
 * Приводит текст к виду, в котором словарь фильтра находит замаскированные слова: нижний регистр, ё → е,
 * латинские буквы и цифры, похожие на кириллицу, внутри русских слов («xу9», «e6ать»), буквы через
 * разделители («х.у.й», «х у й») и растянутые повторы («хууууй»). Для поиска, не для показа.
 */
@UtilityClass
public class TextNormalizer {

	/** Похожие на кириллицу латинские буквы и цифры; заменяются только в словах, где уже есть кириллица. */
	private static final Map<Character, Character> LOOKALIKES = Map.ofEntries(
			Map.entry('a', 'а'), Map.entry('b', 'в'), Map.entry('c', 'с'), Map.entry('e', 'е'), Map.entry('h', 'н'),
			Map.entry('k', 'к'), Map.entry('m', 'м'), Map.entry('n', 'п'), Map.entry('o', 'о'), Map.entry('p', 'р'),
			Map.entry('r', 'г'), Map.entry('t', 'т'), Map.entry('u', 'и'), Map.entry('x', 'х'), Map.entry('y', 'у'),
			Map.entry('0', 'о'), Map.entry('3', 'з'), Map.entry('4', 'ч'), Map.entry('6', 'б'), Map.entry('9', 'я'),
			Map.entry('@', 'а'), Map.entry('$', 'с'));

	/** Слово с возможными «масками» внутри: буквы, цифры и @ $ * подряд. */
	private static final Pattern TOKEN = Pattern.compile("[\\p{L}\\p{N}@$*]+");
	/** Одиночные буквы через разделители: «х.у.й», «х у й», «х-у-й» (минимум три буквы). */
	private static final Pattern SPACED = Pattern.compile(
			"(?<![\\p{L}\\p{N}])\\p{L}(?:[\\s.,\\-_*+|/\\\\~]+\\p{L}(?![\\p{L}\\p{N}])){2,}");
	private static final List<String> MASKED_VOWELS = List.of("а", "е", "и", "о", "у", "ы", "я", "ю");
	private static final Pattern REPEATS = Pattern.compile("(\\p{L})\\1{2,}");

	/**
	 * Варианты текста для проверки: исходный в нижнем регистре и «очищенный» от масок.
	 * Повторы букв схлопываются до одной в отдельном варианте, чтобы не ломать обычные двойные буквы.
	 */
	public static List<String> variants(String text) {
		if (text == null || text.isBlank()) {
			return List.of();
		}
		var lower = text.toLowerCase(Locale.ROOT).replace('ё', 'е');
		var joined = joinSpaced(lower);
		var cyrillic = cyrillize(joined);
		var out = new LinkedHashSet<String>();
		out.add(lower);
		out.add(joined);
		for (var unmasked : unmask(cyrillic)) {
			out.add(unmasked);
			out.add(collapseRepeats(unmasked, 1));
			out.add(collapseRepeats(unmasked, 2));
		}
		return new ArrayList<>(out);
	}

	/** «б.е.г» → «бег»: склеивает одиночные буквы через разделители. */
	static String joinSpaced(String text) {
		return SPACED.matcher(text).replaceAll(m -> m.group().replaceAll("[^\\p{L}]", ""));
	}

	/** В словах с кириллицей латинские двойники и цифры становятся кириллицей. */
	static String cyrillize(String text) {
		var m = TOKEN.matcher(text);
		var sb = new StringBuilder();
		while (m.find()) {
			var token = m.group();
			m.appendReplacement(sb, java.util.regex.Matcher.quoteReplacement(
					hasCyrillic(token) ? replaceLookalikes(token) : token));
		}
		m.appendTail(sb);
		return sb.toString();
	}

	/** «бл*ть»: звёздочка — скрытая буква; пробуем без неё и с каждой гласной. */
	static List<String> unmask(String text) {
		if (text.indexOf('*') < 0) {
			return List.of(text);
		}
		var out = new ArrayList<String>();
		out.add(text.replace("*", ""));
		for (var vowel : MASKED_VOWELS) {
			out.add(text.replace("*", vowel));
		}
		return out;
	}

	/** «гоооол» → «гол» (keep = 1) или «гоол» (keep = 2): растянутые буквы. */
	static String collapseRepeats(String text, int keep) {
		return REPEATS.matcher(text).replaceAll(m -> m.group(1).repeat(keep));
	}

	private static boolean hasCyrillic(String token) {
		return token.chars().anyMatch(c -> Character.UnicodeScript.of(c) == Character.UnicodeScript.CYRILLIC);
	}

	private static String replaceLookalikes(String token) {
		var sb = new StringBuilder(token.length());
		for (char c : token.toCharArray()) {
			sb.append(LOOKALIKES.getOrDefault(c, c));
		}
		return sb.toString();
	}
}
