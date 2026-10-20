package com.hackathon.app.util;

import java.util.regex.Pattern;

import lombok.experimental.UtilityClass;

/**
 * Текст поста без разметки — для превью в карточке и оценки времени чтения. Сам Markdown рисует фронт.
 * static пишем явно: иначе MapStruct внедрял бы класс как бин (см. Strings).
 */
@UtilityClass
public class Markdown {

	private static final Pattern CODE_BLOCK = Pattern.compile("```[\\s\\S]*?(```|$)");
	private static final Pattern LINK = Pattern.compile("\\[([^\\]]*)]\\([^)]*\\)");
	private static final Pattern LINE_MARKERS = Pattern.compile("(?m)^\\s{0,3}(#{1,6}\\s+|>\\s?|[-*+]\\s+|\\d+[.)]\\s+)");
	private static final Pattern INLINE_MARKERS = Pattern.compile("\\*\\*|__|~~|\\|\\||[*_`]");
	private static final Pattern SPACES = Pattern.compile("\\s+");
	/** Слов в минуту: спокойное чтение с экрана. */
	private static final int WORDS_PER_MINUTE = 180;

	/** Чистый текст: без блоков кода, ссылки — только подписью, без маркеров заголовков, цитат, списков и выделения. */
	public static String plain(String markdown) {
		if (markdown == null) {
			return "";
		}
		var text = CODE_BLOCK.matcher(markdown).replaceAll(" ");
		text = LINK.matcher(text).replaceAll("$1");
		text = LINE_MARKERS.matcher(text).replaceAll("");
		text = INLINE_MARKERS.matcher(text).replaceAll("");
		return SPACES.matcher(text).replaceAll(" ").strip();
	}

	/** Начало чистого текста не длиннее max символов, по границе слова, с многоточием. */
	public static String excerpt(String markdown, int max) {
		var text = plain(markdown);
		if (text.length() <= max) {
			return text;
		}
		var cut = text.substring(0, max);
		int space = cut.lastIndexOf(' ');
		return (space > max / 2 ? cut.substring(0, space) : cut).stripTrailing() + "…";
	}

	/** Минут чтения, не меньше одной. */
	public static int readMinutes(String markdown) {
		var text = plain(markdown);
		int words = text.isEmpty() ? 0 : text.split(" ").length;
		return Math.max(1, Math.round(words / (float) WORDS_PER_MINUTE));
	}
}
