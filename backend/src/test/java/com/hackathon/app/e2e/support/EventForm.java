package com.hackathon.app.e2e.support;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.dto.ScheduleRequest;

/**
 * Форма мероприятия для тестов. По умолчанию валидная очная встреча по бегу через двое суток;
 * тест меняет только то, что важно для сценария:
 * <pre>{@code
 * EventForm.byRequest().online("https://meet.example.com/x").capacity(2).startsIn(Duration.ofHours(3))
 * }</pre>
 * Для проверок валидации есть {@link #with} и {@link #without}: форма может стать заведомо неверной.
 */
public final class EventForm {

	private final Map<String, Object> fields = new LinkedHashMap<>();

	private EventForm(String joinMode) {
		fields.put("title", TestApi.uniqueName("Тренировка "));
		fields.put("description", "Совместная тренировка клуба");
		fields.put("sportName", "Бег");
		fields.put("startAt", Instant.now().plus(2, java.time.temporal.ChronoUnit.DAYS).toString());
		fields.put("format", "OFFLINE");
		fields.put("address", "Красноярск, спортивная площадка");
		fields.put("lat", 56.0153);
		fields.put("lon", 92.8932);
		fields.put("joinMode", joinMode);
	}

	/** Пустая форма для проверки обязательных полей. */
	public static EventForm empty() {
		var form = new EventForm("FREE");
		form.fields.clear();
		return form;
	}

	/** Свободная запись: участник сразу подтверждён. */
	public static EventForm free() {
		return new EventForm("FREE");
	}

	/** Запись по заявке: решение принимает организатор. */
	public static EventForm byRequest() {
		return new EventForm("REQUEST");
	}

	public EventForm title(String title) {
		return with("title", title);
	}

	public EventForm description(String description) {
		return with("description", description);
	}

	/** Вид спорта по названию: из справочника или новый (сервер создаст custom). */
	public EventForm sport(String name) {
		fields.remove("sportId");
		return with("sportName", name);
	}

	/** Вид спорта из справочника по id. */
	public EventForm sportId(UUID sportId) {
		fields.remove("sportName");
		return with("sportId", sportId.toString());
	}

	public EventForm startsAt(Instant startAt) {
		return with("startAt", startAt.toString());
	}

	/** Начало через указанное время от текущего момента; отрицательное — уже началось. */
	public EventForm startsIn(Duration fromNow) {
		return startsAt(Instant.now().plus(fromNow));
	}

	public EventForm endsAt(Instant endAt) {
		return with("endAt", endAt.toString());
	}

	/** Очная встреча в точке на карте. */
	public EventForm offline(String address, double lat, double lon) {
		fields.remove("onlineUrl");
		return with("format", "OFFLINE").with("address", address).with("lat", lat).with("lon", lon);
	}

	/** Онлайн-встреча: адреса и координат нет, ссылку видят только участники. */
	public EventForm online(String url) {
		fields.remove("address");
		fields.remove("lat");
		fields.remove("lon");
		return with("format", "ONLINE").with("onlineUrl", url);
	}

	/** Расписание серии вместо времени разового события. */
	public EventForm schedule(ScheduleRequest schedule) {
		fields.put("startAt", null);
		fields.remove("endAt");
		return with("schedule", schedule);
	}

	/** Минимум участников, при котором занятие состоится. */
	public EventForm minParticipants(int minParticipants) {
		return with("minParticipants", minParticipants);
	}

	public EventForm capacity(int capacity) {
		return with("capacity", capacity);
	}

	/** Точное место или ссылка на чат: видят только подтверждённые участники и организаторы. */
	public EventForm privateDetails(String details) {
		return with("privateDetails", details);
	}

	public EventForm level(String level) {
		return with("level", level);
	}

	/** Любое поле формы как есть, в том числе заведомо неверное значение. */
	public EventForm with(String field, Object value) {
		fields.put(field, value);
		return this;
	}

	/** Убрать поле: проверить, что сервер требует его. */
	public EventForm without(String field) {
		fields.remove(field);
		return this;
	}

	/** Текущее значение поля, например заголовок для поиска. */
	public Object get(String field) {
		return fields.get(field);
	}

	public Map<String, Object> toMap() {
		return new LinkedHashMap<>(fields);
	}
}
