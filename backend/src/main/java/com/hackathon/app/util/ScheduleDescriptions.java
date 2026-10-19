package com.hackathon.app.util;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import lombok.experimental.UtilityClass;
import org.dmfs.rfc5545.Weekday;
import org.dmfs.rfc5545.recur.InvalidRecurrenceRuleException;
import org.dmfs.rfc5545.recur.RecurrenceRule;
import org.dmfs.rfc5545.recur.RecurrenceRule.Part;

/**
 * Расписание серии словами: «по вторникам в 20:00», «по воскресеньям раз в 2 недели в 14:00».
 * Понимает DAILY, WEEKLY и MONTHLY с INTERVAL, BYDAY и BYMONTHDAY; всё остальное — «по расписанию»
 * (точные даты фронт берёт из списка занятий). COUNT и UNTIL не описываем: серию и так ограничивают её границы.
 */
@UtilityClass
public class ScheduleDescriptions {

	private static final String FALLBACK = "по расписанию";
	private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");
	/**
	 * Части правила, которые умеем сказать словами. Именами, а не константами Part: в lib-recur классы Part и
	 * RecurrenceRule инициализируют друг друга по кругу, и если Part загрузить первым (здесь, в статическом поле),
	 * его инициализация падает до перезапуска JVM (ExceptionInInitializerError в RecurrenceRule$Part). К Part
	 * обращаемся только после new RecurrenceRule(...).
	 */
	private static final Set<String> SUPPORTED = Set.of("FREQ", "INTERVAL", "BYDAY", "BYMONTHDAY", "COUNT", "UNTIL", "WKST");

	/** Все правила через «; » в их порядке. */
	public static String describe(List<LocalDateTime> firstStarts, List<String> rrules) {
		return IntStream.range(0, rrules.size())
				.mapToObj(i -> describe(firstStarts.get(i), rrules.get(i)))
				.collect(Collectors.joining("; "));
	}

	/** Одно правило: повторение + время первого занятия. Если правило не разобрать — «по расписанию». */
	public static String describe(LocalDateTime firstStart, String rrule) {
		RecurrenceRule rule;
		try {
			rule = new RecurrenceRule(rrule);
		} catch (InvalidRecurrenceRuleException e) {
			return FALLBACK;
		}
		for (var part : Part.values()) {
			if (rule.hasPart(part) && !SUPPORTED.contains(part.name())) {
				return FALLBACK;
			}
		}
		var repeat = switch (rule.getFreq()) {
			case DAILY -> rule.hasPart(Part.BYDAY) || rule.hasPart(Part.BYMONTHDAY) ? null : daily(rule.getInterval());
			case WEEKLY -> rule.hasPart(Part.BYMONTHDAY) ? null : weekly(rule, firstStart);
			case MONTHLY -> monthly(rule, firstStart);
			default -> null;
		};
		return repeat == null ? FALLBACK : repeat + " в " + firstStart.format(TIME);
	}

	private static String daily(int interval) {
		return switch (interval) {
			case 1 -> "каждый день";
			case 2 -> "через день";
			default -> "раз в " + interval + " " + plural(interval, "день", "дня", "дней");
		};
	}

	private static String weekly(RecurrenceRule rule, LocalDateTime firstStart) {
		var days = rule.hasPart(Part.BYDAY) ? rule.getByDayPart() : List.of(new RecurrenceRule.WeekdayNum(0,
				Weekday.values()[firstStart.getDayOfWeek().getValue() % 7]));
		if (days.stream().anyMatch(day -> day.pos != 0)) {
			return null;
		}
		var weekdays = days.stream().map(day -> toDayOfWeek(day.weekday)).collect(Collectors.toCollection(
				() -> EnumSet.noneOf(DayOfWeek.class)));
		int interval = rule.getInterval();
		if (weekdays.size() == 7 && interval == 1) {
			return "каждый день";
		}
		var names = joinRussian(weekdays.stream().map(ScheduleDescriptions::dativePlural).toList());
		var every = interval == 1 ? "" : " раз в " + interval + " " + plural(interval, "неделю", "недели", "недель");
		return "по " + names + every;
	}

	private static String monthly(RecurrenceRule rule, LocalDateTime firstStart) {
		var every = rule.getInterval() == 1 ? "каждый месяц"
				: "раз в " + rule.getInterval() + " " + plural(rule.getInterval(), "месяц", "месяца", "месяцев");
		if (rule.hasPart(Part.BYDAY) && rule.hasPart(Part.BYMONTHDAY)) {
			return null;
		}
		if (rule.hasPart(Part.BYDAY)) {
			var days = rule.getByDayPart();
			if (days.size() != 1 || days.getFirst().pos == 0) {
				return null;
			}
			var ordinal = ordinal(days.getFirst().pos, toDayOfWeek(days.getFirst().weekday));
			return ordinal == null ? null : every + ", " + ordinal;
		}
		var monthDays = rule.hasPart(Part.BYMONTHDAY) ? rule.getByPart(Part.BYMONTHDAY)
				: List.of(firstStart.getDayOfMonth());
		if (monthDays.stream().anyMatch(day -> day < 1)) {
			return null;
		}
		return every + ", " + joinRussian(monthDays.stream().sorted().map(day -> day + "-го").toList()) + " числа";
	}

	/** «в первую субботу месяца», «в последнее воскресенье месяца»; дальше четвёртой — не описываем. */
	private static String ordinal(int pos, DayOfWeek day) {
		var gender = switch (day) {
			case WEDNESDAY, FRIDAY, SATURDAY -> 1;
			case SUNDAY -> 2;
			default -> 0;
		};
		String[][] words = {
				{ "первый", "первую", "первое" }, { "второй", "вторую", "второе" }, { "третий", "третью", "третье" },
				{ "четвёртый", "четвёртую", "четвёртое" } };
		String word;
		if (pos == -1) {
			word = new String[] { "последний", "последнюю", "последнее" }[gender];
		} else if (pos >= 1 && pos <= 4) {
			word = words[pos - 1][gender];
		} else {
			return null;
		}
		return "в " + word + " " + accusative(day) + " месяца";
	}

	private static DayOfWeek toDayOfWeek(Weekday weekday) {
		// Weekday в библиотеке начинается с воскресенья (SU = 0)
		return DayOfWeek.of(weekday.ordinal() == 0 ? 7 : weekday.ordinal());
	}

	private static String dativePlural(DayOfWeek day) {
		return switch (day) {
			case MONDAY -> "понедельникам";
			case TUESDAY -> "вторникам";
			case WEDNESDAY -> "средам";
			case THURSDAY -> "четвергам";
			case FRIDAY -> "пятницам";
			case SATURDAY -> "субботам";
			case SUNDAY -> "воскресеньям";
		};
	}

	private static String accusative(DayOfWeek day) {
		return switch (day) {
			case MONDAY -> "понедельник";
			case TUESDAY -> "вторник";
			case WEDNESDAY -> "среду";
			case THURSDAY -> "четверг";
			case FRIDAY -> "пятницу";
			case SATURDAY -> "субботу";
			case SUNDAY -> "воскресенье";
		};
	}

	/** «a», «a и b», «a, b и c». */
	private static String joinRussian(List<String> items) {
		if (items.size() == 1) {
			return items.getFirst();
		}
		return String.join(", ", items.subList(0, items.size() - 1)) + " и " + items.getLast();
	}

	/** Форма слова по числу: 1 день, 2 дня, 5 дней, 21 день. */
	public static String plural(int n, String one, String few, String many) {
		int mod100 = n % 100;
		int mod10 = n % 10;
		if (mod100 >= 11 && mod100 <= 14) {
			return many;
		}
		return mod10 == 1 ? one : mod10 >= 2 && mod10 <= 4 ? few : many;
	}
}
