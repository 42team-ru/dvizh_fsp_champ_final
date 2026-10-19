package com.hackathon.app.service;

import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.TreeMap;

import com.hackathon.app.domain.dto.ScheduleRequest;
import com.hackathon.app.domain.exception.BadRequestException;
import org.dmfs.rfc5545.recur.Freq;
import org.dmfs.rfc5545.recur.InvalidRecurrenceRuleException;
import org.dmfs.rfc5545.recur.RecurrenceRule;
import org.springframework.stereotype.Component;

/**
 * Разворачивает расписание серии в список занятий: каждое правило (RRULE от своего первого занятия)
 * в часовом поясе серии, обрезанное границами серии. Местное время сохраняется при переходе на летнее время.
 * Только расчёт и проверка формы, без базы.
 */
@Component
public class ScheduleExpander {

	/** Больше занятий в одной серии не бывает. */
	static final int MAX_OCCURRENCES = 500;
	/** Серия не длиннее года (с запасом на високосный). */
	static final int MAX_SERIES_DAYS = 366;
	/** Чаще раза в день занятия не повторяются. */
	private static final EnumSet<Freq> TOO_FREQUENT = EnumSet.of(Freq.SECONDLY, Freq.MINUTELY, Freq.HOURLY);
	/** Защита от правил, которые долго не дают ни одного занятия: дальше столько шагов не перебираем. */
	private static final int MAX_STEPS = 10_000;

	/** Правило после проверки: rrule в каноничном виде, без префикса RRULE:. */
	public record Rule(LocalDateTime firstStart, int durationMinutes, String rrule) {
	}

	/** Одно занятие по расписанию. */
	public record Slot(Instant start, Instant end) {
	}

	/** Проверенное расписание и все его занятия по порядку (без дублей по времени начала). */
	public record Expanded(ZoneId zone, List<Rule> rules, List<Slot> slots) {

		/** Занятия, которые ещё не начались. */
		public List<Slot> after(Instant now) {
			return slots.stream().filter(slot -> slot.start().isAfter(now)).toList();
		}
	}

	/** Проверяет расписание (ошибки — 400 с текстом для человека) и разворачивает его в занятия. */
	public Expanded expand(ScheduleRequest schedule) {
		var zone = zone(schedule.timeZone());
		if (schedule.endDate().isBefore(schedule.startDate())) {
			throw new BadRequestException("Последний день серии не может быть раньше первого");
		}
		if (ChronoUnit.DAYS.between(schedule.startDate(), schedule.endDate()) >= MAX_SERIES_DAYS) {
			throw new BadRequestException("Серия может длиться не больше года");
		}
		var windowStart = schedule.startDate().atStartOfDay(zone).toInstant();
		var windowEnd = schedule.endDate().plusDays(1).atStartOfDay(zone).toInstant();

		var rules = new ArrayList<Rule>();
		// по началу: совпавшие по времени занятия разных правил схлопываются, остаётся первое
		var slotsByStart = new TreeMap<Instant, Slot>();
		for (int i = 0; i < schedule.rules().size(); i++) {
			var request = schedule.rules().get(i);
			var label = schedule.rules().size() > 1 ? "Правило " + (i + 1) + ": " : "";
			var firstDate = request.firstStart().toLocalDate();
			if (firstDate.isBefore(schedule.startDate()) || firstDate.isAfter(schedule.endDate())) {
				throw new BadRequestException(message(label, "первое занятие должно попадать в границы серии"));
			}
			var rule = parse(request.rrule(), label);
			rules.add(new Rule(request.firstStart(), request.durationMinutes(), rule.toString()));
			var duration = Duration.ofMinutes(request.durationMinutes());
			var iterator = rule.iterator(request.firstStart().atZone(zone).toInstant().toEpochMilli(),
					TimeZone.getTimeZone(zone));
			for (int step = 0; step < MAX_STEPS && iterator.hasNext(); step++) {
				var start = Instant.ofEpochMilli(iterator.nextMillis());
				if (!start.isBefore(windowEnd)) {
					break;
				}
				if (start.isBefore(windowStart)) {
					continue;
				}
				slotsByStart.putIfAbsent(start, new Slot(start, start.plus(duration)));
				if (slotsByStart.size() > MAX_OCCURRENCES) {
					throw new BadRequestException("В серии не может быть больше " + MAX_OCCURRENCES + " занятий");
				}
			}
		}
		if (slotsByStart.isEmpty()) {
			throw new BadRequestException("По этому расписанию в границах серии нет ни одного занятия");
		}
		return new Expanded(zone, List.copyOf(rules), List.copyOf(slotsByStart.values()));
	}

	/** Часовой пояс только по имени IANA (Asia/Krasnoyarsk): смещение вида +07:00 не знает про переход на летнее время. */
	static ZoneId zone(String timeZone) {
		try {
			var zone = ZoneId.of(timeZone.trim());
			if (!zone.getId().contains("/") && !zone.getId().equals("UTC")) {
				throw new BadRequestException("Укажите часовой пояс по названию, например Asia/Krasnoyarsk");
			}
			return zone;
		} catch (DateTimeException e) {
			throw new BadRequestException("Неизвестный часовой пояс: " + timeZone);
		}
	}

	/** Строгий разбор: в нестрогом режиме библиотека молча выбрасывает ошибочные части правила. */
	static RecurrenceRule parse(String rrule, String label) {
		var text = rrule.trim();
		if (text.toUpperCase(Locale.ROOT).startsWith("RRULE:")) {
			text = text.substring("RRULE:".length());
		}
		RecurrenceRule rule;
		try {
			rule = new RecurrenceRule(text, RecurrenceRule.RfcMode.RFC5545_STRICT);
		} catch (InvalidRecurrenceRuleException | IllegalArgumentException e) {
			throw new BadRequestException(message(label, "не удалось разобрать правило повторения (" + e.getMessage() + ")"));
		}
		if (TOO_FREQUENT.contains(rule.getFreq())) {
			throw new BadRequestException(message(label, "занятия не могут повторяться чаще раза в день"));
		}
		return rule;
	}

	/** «Правило 2: текст» или «Текст», если правило одно. */
	private static String message(String label, String text) {
		return label.isEmpty() ? Character.toUpperCase(text.charAt(0)) + text.substring(1) : label + text;
	}
}
