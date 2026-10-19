package com.hackathon.app.service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Locale;
import java.util.Objects;
import java.util.stream.Stream;

import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Notification;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/**
 * Карточка мероприятия для Telegram: заголовок уведомления, название, дата, место, подробности и картинка.
 * Картинка — первое фото мероприятия, иначе иллюстрация вида спорта. Приватные детали и ссылку онлайн-встречи
 * карточка не показывает: их видят только подтверждённые участники на сайте.
 */
@Service
@RequiredArgsConstructor
public class TelegramCard {

	/** Подпись к фото в Telegram — не больше 1024 символов. */
	static final int CAPTION_LIMIT = 1024;

	private static final Locale RU = Locale.forLanguageTag("ru");
	private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("EEE, d MMMM", RU);
	private static final DateTimeFormatter DAY_WITH_YEAR = DateTimeFormatter.ofPattern("EEE, d MMMM yyyy", RU);
	private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm", RU);

	private final EventRepository events;
	private final EventOccurrenceRepository occurrences;
	private final StoredFileRepository files;
	private final SportRepository sports;
	private final DbTimeRepository dbTime;
	private final NotificationProperties properties;

	/** Текст и картинка одного сообщения. */
	public record Content(String text, NotificationTransport.Photo photo) {
	}

	/** Уведомление о мероприятии — карточкой с картинкой; остальные (организации) — заголовком, текстом и ссылкой. */
	public Content build(Notification notification, String link) {
		var event = notification.getEventId() == null ? null : events.findById(notification.getEventId()).orElse(null);
		if (event == null) {
			return new Content(fit(notification.getTitle(), notification.getBody(), link, 4000), null);
		}
		var lines = new ArrayList<String>();
		lines.add("«" + event.getTitle() + "»");
		var when = when(event, notification);
		if (when != null) {
			lines.add("📅 " + when);
		}
		var place = place(event);
		if (place != null) {
			lines.add("📍 " + place);
		}
		// Первая строка текста уведомления — название (и время), его уже показали выше.
		var body = notification.getBody() == null ? "" : notification.getBody();
		var detail = body.contains("\n") ? body.substring(body.indexOf('\n') + 1).strip() : "";
		if (!detail.isEmpty()) {
			lines.add("");
			lines.add(detail);
		}
		return new Content(fit("🔔 " + notification.getTitle(), String.join("\n", lines), link, CAPTION_LIMIT), photo(event));
	}

	/** Дата конкретного занятия; без него — ближайшее занятие серии или время разового мероприятия. */
	private String when(Event event, Notification notification) {
		EventOccurrence occurrence = notification.getOccurrenceId() == null ? null
				: occurrences.findById(notification.getOccurrenceId()).orElse(null);
		if (occurrence == null) {
			var now = dbTime.now();
			var slots = occurrences.findByEventIdOrderByStartAt(event.getId());
			occurrence = slots.stream()
					.filter(o -> o.getStatus() == OccurrenceStatus.SCHEDULED && o.getStartAt().isAfter(now))
					.findFirst()
					.orElse(event.isRecurring() ? null : slots.stream().findFirst().orElse(null));
		}
		var start = occurrence != null ? occurrence.getStartAt() : event.isRecurring() ? null : event.getStartAt();
		var end = occurrence != null ? occurrence.getEndAt() : event.isRecurring() ? null : event.getEndAt();
		if (start == null) {
			return null;
		}
		var text = period(start, end, zone(event));
		return occurrence != null && occurrence.getStatus() == OccurrenceStatus.CANCELLED ? text + " (отменено)" : text;
	}

	private String period(Instant start, Instant end, ZoneId zone) {
		var from = start.atZone(zone);
		var sameYear = from.getYear() == dbTime.now().atZone(zone).getYear();
		var text = capitalize((sameYear ? DAY : DAY_WITH_YEAR).format(from)) + ", " + TIME.format(from);
		if (end != null) {
			var to = end.atZone(zone);
			text += to.toLocalDate().equals(from.toLocalDate()) ? "–" + TIME.format(to)
					: " – " + DAY.format(to) + ", " + TIME.format(to);
		}
		// Пояс по умолчанию — город платформы; другой пояс подписываем, чтобы время не поняли неверно.
		return zone.getId().equals(properties.timeZone()) ? text : text + " (" + zone.getId() + ")";
	}

	private String place(Event event) {
		if (event.getFormat() == EventFormat.ONLINE) {
			return "Онлайн";
		}
		var parts = Stream.of(event.getAddress(), event.getLocationNote())
				.filter(Objects::nonNull).map(String::strip).filter(s -> !s.isEmpty()).toList();
		return parts.isEmpty() ? null : String.join(" · ", parts);
	}

	private NotificationTransport.Photo photo(Event event) {
		var cover = files.findByEventIdAndKindOrderByPositionAscCreatedAtAsc(event.getId(), FileKind.EVENT_PHOTO)
				.stream().findFirst();
		if (cover.isPresent()) {
			return new NotificationTransport.Photo(cover.get().getObjectKey(), null, cover.get().getContentType());
		}
		var slug = sports.findById(event.getSportId()).map(s -> s.getSlug()).orElse(null);
		var resource = slug != null && new ClassPathResource("sport-images/" + slug + ".webp").exists()
				? "sport-images/" + slug + ".webp"
				: "sport-images/default.webp";
		return new NotificationTransport.Photo(null, resource, "image/webp");
	}

	private ZoneId zone(Event event) {
		return ZoneId.of(event.getTimeZone() == null ? properties.timeZone() : event.getTimeZone());
	}

	/** Заголовок, текст и ссылка в пределах лимита; урезается только текст, ссылка остаётся целиком. */
	static String fit(String title, String body, String link, int limit) {
		var tail = "\n\nОткрыть: " + link;
		var head = title + "\n\n";
		int budget = Math.max(0, limit - head.length() - tail.length());
		var text = body == null ? "" : body;
		if (text.length() > budget) {
			text = text.substring(0, Math.max(0, budget - 1)).stripTrailing() + "…";
		}
		return head + text + tail;
	}

	private static String capitalize(String text) {
		return text.isEmpty() ? text : text.substring(0, 1).toUpperCase(RU) + text.substring(1);
	}
}
