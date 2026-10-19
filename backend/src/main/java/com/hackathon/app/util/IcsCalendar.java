package com.hackathon.app.util;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

import lombok.experimental.UtilityClass;

/**
 * Календарь iCalendar (RFC 5545) для «Добавить в календарь»: один VEVENT на занятие. Без библиотеки — формат простой,
 * но у него две ловушки: спецсимволы в тексте экранируются, а строки длиннее 75 байт переносятся (CRLF + пробел).
 */
@UtilityClass
public class IcsCalendar {

	private static final DateTimeFormatter UTC = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
	private static final int MAX_LINE_BYTES = 75;

	/** Одно занятие: uid — стабильный id (повторный импорт обновит, а не задвоит), end — null, если не задан. */
	public record Entry(String uid, Instant start, Instant end, String summary, String location, String description) {
	}

	public static String build(List<Entry> entries, Instant now) {
		var out = new StringBuilder();
		line(out, "BEGIN:VCALENDAR");
		line(out, "VERSION:2.0");
		line(out, "PRODID:-//Sport Together//Events//RU");
		line(out, "CALSCALE:GREGORIAN");
		line(out, "METHOD:PUBLISH");
		for (var entry : entries) {
			line(out, "BEGIN:VEVENT");
			line(out, "UID:" + entry.uid());
			line(out, "DTSTAMP:" + UTC.format(now));
			line(out, "DTSTART:" + UTC.format(entry.start()));
			if (entry.end() != null) {
				line(out, "DTEND:" + UTC.format(entry.end()));
			}
			line(out, "SUMMARY:" + escape(entry.summary()));
			if (entry.location() != null) {
				line(out, "LOCATION:" + escape(entry.location()));
			}
			if (entry.description() != null) {
				line(out, "DESCRIPTION:" + escape(entry.description()));
			}
			line(out, "END:VEVENT");
		}
		line(out, "END:VCALENDAR");
		return out.toString();
	}

	/** Обратная косая, точка с запятой, запятая и перевод строки — по RFC 5545, 3.3.11. */
	static String escape(String text) {
		return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
				.replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", "");
	}

	/** Перенос по байтам UTF-8, не разрывая символ: кириллица — 2 байта, поэтому считать по символам нельзя. */
	private static void line(StringBuilder out, String content) {
		int bytes = 0;
		int limit = MAX_LINE_BYTES;
		for (int i = 0; i < content.length(); ) {
			int codePoint = content.codePointAt(i);
			int size = new String(Character.toChars(codePoint)).getBytes(StandardCharsets.UTF_8).length;
			if (bytes + size > limit) {
				out.append("\r\n ");
				bytes = 0;
				limit = MAX_LINE_BYTES - 1; // продолжение начинается с пробела
			}
			out.appendCodePoint(codePoint);
			bytes += size;
			i += Character.charCount(codePoint);
		}
		out.append("\r\n");
	}
}
