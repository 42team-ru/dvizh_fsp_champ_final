package com.hackathon.app.service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.PetStatusResponse;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.LedgerKind;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.domain.enums.PetMood;
import com.hackathon.app.domain.enums.PetStatusReason;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.repository.CoinLedgerRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.UserAchievementRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RegistrationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Состояние бобра: правила 1–9 проверяются строго по порядку, побеждает первое совпадение. */
@Service
public class PetMoodService {
    /** События и авторство. */
    private final EventRepository events;
    /** Записи участников. */
    private final RegistrationRepository registrations;
    /** Ближайшие запланированные занятия, включая серии. */
    private final EventOccurrenceRepository occurrences;
    /** Журнал монет: награды за встречи. */
    private final CoinLedgerRepository ledger;
    /** Полученные достижения. */
    private final UserAchievementRepository achievements;
    /** Инвентарь: что предложить купить. */
    private final ShopService shop;
    /** Единое бизнес-время базы. */
    private final DbTimeRepository time;
    /** Пояс для разовых встреч, у которых нет собственного timeZone; совпадает с демо-городом. */
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("Asia/Krasnoyarsk");
    /** Начисления за встречи (достижения отдельно). */
    private static final java.util.List<LedgerKind> COIN_KINDS = java.util.List.of(LedgerKind.MEETING,
            LedgerKind.FIRST_MEETING, LedgerKind.ORGANIZER_MEETING, LedgerKind.FIRST_ORGANIZED);
    /** Дата в короткой русской записи. */
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    /** Часы и минуты в локальном времени встречи. */
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    public PetMoodService(EventRepository events, RegistrationRepository registrations,
            EventOccurrenceRepository occurrences, CoinLedgerRepository ledger,
            UserAchievementRepository achievements, ShopService shop, DbTimeRepository time) {
        this.ledger = ledger;
        this.achievements = achievements;
        this.shop = shop;
        this.events = events;
        this.registrations = registrations;
        this.occurrences = occurrences;
        this.time = time;
    }

    /** Личное состояние в одном снимке времени БД; внутри правила выбирается самое свежее событие. */
    @Transactional(readOnly = true)
    public PetStatusResponse compute(UUID userId) {
        var now = time.now();
        var mine = registrations.findByUserIdOrderByCreatedAtDesc(userId);
        var organized = events.findOrganizedBy(userId);
        var related = new HashMap<UUID, Event>();
        events.findAllById(mine.stream().map(Registration::getEventId).distinct().toList())
                .forEach(e -> related.put(e.getId(), e));
        organized.forEach(e -> related.put(e.getId(), e));
        var latestModeration = Comparator.comparing(Event::getModeratedAt).reversed()
                .thenComparing(Event::getId);

        // 1. Недавно снятая встреча автора или соорганизатора.
        var moderated = organized.stream().filter(e -> moderated(e, now)).sorted(latestModeration).findFirst();
        if (moderated.isPresent()) {
            var event = moderated.get();
            return state(PetMood.OFFENDED, "Мою встречу «" + event.getTitle() + "» сняли" + suffix(event.getModerationReason()),
                    PetStatusReason.ORGANIZED_EVENT_MODERATED, event);
        }
        // 2. Недавно снятая встреча, на которую пользователь записан или ожидает решения.
        moderated = mine.stream().filter(PetMoodService::active).map(r -> related.get(r.getEventId()))
                .filter(e -> moderated(e, now)).sorted(latestModeration).findFirst();
        if (moderated.isPresent()) {
            var event = moderated.get();
            return state(PetMood.SAD, "Встречу «" + event.getTitle() + "» отменили" + suffix(event.getModerationReason()),
                    PetStatusReason.REGISTERED_EVENT_MODERATED, event);
        }
        var decisions = mine.stream().filter(r -> r.getDecidedAt() != null)
                .sorted(Comparator.comparing(Registration::getDecidedAt).reversed().thenComparing(Registration::getId)).toList();
        // 3. Отказ за последние трое суток.
        for (var r : decisions) {
            if (r.getStatus() == RegistrationStatus.REJECTED && recent(r.getDecidedAt(), now, Duration.ofDays(3))) {
                var event = related.get(r.getEventId());
                return state(PetMood.SAD, "Не взяли на «" + event.getTitle() + "»" + suffix(r.getDecisionReason()),
                        PetStatusReason.REGISTRATION_REJECTED, event);
            }
        }
        // 4. Одобрение организатором за последние сутки; свободная запись сюда не попадает.
        for (var r : decisions) {
            if (r.getStatus() == RegistrationStatus.CONFIRMED && r.getDecidedById() != null
                    && recent(r.getDecidedAt(), now, Duration.ofHours(24))) {
                var event = related.get(r.getEventId());
                return state(PetMood.WINK, "Меня приняли на «" + event.getTitle() + "»!",
                        PetStatusReason.REGISTRATION_APPROVED, event);
            }
        }
        // 4а. Новое достижение за последние сутки.
        var achievement = achievements.findByUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(userId, now.minus(Duration.ofHours(24)))
                .stream().filter(a -> recent(a.getCreatedAt(), now, Duration.ofHours(24))).findFirst();
        if (achievement.isPresent()) {
            return state(PetMood.HAPPY, "Новое достижение: «" + achievement.get().getCode().getTitle() + "»!",
                    PetStatusReason.ACHIEVEMENT_EARNED, null);
        }
        // 4б. Монеты за встречу за последние сутки: сумма всех начислений за последнее занятие.
        var earned = ledger.findByUserIdAndKindInAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(userId, COIN_KINDS,
                now.minus(Duration.ofHours(24))).stream().filter(e -> recent(e.getCreatedAt(), now, Duration.ofHours(24))).toList();
        if (!earned.isEmpty() && earned.getFirst().getEventId() != null) {
            var latest = earned.getFirst();
            int sum = earned.stream().filter(e -> java.util.Objects.equals(e.getOccurrenceId(), latest.getOccurrenceId()))
                    .mapToInt(e -> e.getAmount()).sum();
            var event = events.findById(latest.getEventId()).orElse(null);
            if (event != null) {
                var offer = shop.owns(userId, "hat:cap") ? "Заглянем в магазин?" : "Купим кепку?";
                return state(PetMood.WINK, "+" + sum + " монет за «" + event.getTitle() + "»! " + offer,
                        PetStatusReason.COINS_EARNED, event);
            }
        }
        // Следующее SCHEDULED-занятие: старое начало серии и отменённые даты не считаются будущей встречей.
        Map<UUID, Instant> starts = related.isEmpty() ? Map.of() : occurrences.findNearest(related.keySet(),
                OccurrenceStatus.SCHEDULED, now, Instant.parse("9999-12-31T23:59:59Z")).stream()
                .filter(o -> o.getStartAt().isAfter(now))
                .collect(Collectors.toMap(o -> o.getEventId(), o -> o.getStartAt(), (a, b) -> a));
        var nearest = Comparator.comparing((Event e) -> starts.get(e.getId())).thenComparing(Event::getId);
        var confirmed = mine.stream().filter(r -> r.getStatus() == RegistrationStatus.CONFIRMED)
                .map(r -> related.get(r.getEventId())).filter(e -> future(e, starts)).sorted(nearest).toList();
        // 5. Подтверждённая встреча не позднее чем через 48 часов.
        if (!confirmed.isEmpty()) {
            var event = confirmed.getFirst();
            var start = starts.get(event.getId());
            if (!start.isAfter(now.plus(Duration.ofHours(48)))) {
                return state(PetMood.HAPPY, "Скоро «" + event.getTitle() + "» — " + date(event, start, now)
                        + " в " + TIME.format(start.atZone(zone(event))) + "!", PetStatusReason.EVENT_SOON, event);
            }
        }
        // 6. Заявки на будущие опубликованные встречи организатора; выбирается ближайшая встреча.
        var futureOrganized = organized.stream().filter(e -> future(e, starts)).sorted(nearest).toList();
        if (!futureOrganized.isEmpty()) {
            var counts = registrations.countByEventIds(futureOrganized.stream().map(Event::getId).toList(),
                    RegistrationStatus.PENDING).stream().collect(Collectors.toMap(
                            RegistrationRepository.EventCount::getEventId, RegistrationRepository.EventCount::getCount));
            for (var event : futureOrganized) {
                long n = counts.getOrDefault(event.getId(), 0L);
                if (n > 0) {
                    return state(PetMood.SURPRISED, n + " " + requests(n) + " на «" + event.getTitle() + "»",
                            PetStatusReason.NEW_REQUESTS, event);
                }
            }
        }
        // 7. Собственная заявка на будущую опубликованную встречу.
        var pending = mine.stream().filter(r -> r.getStatus() == RegistrationStatus.PENDING)
                .map(r -> related.get(r.getEventId())).filter(e -> future(e, starts)).sorted(nearest).findFirst();
        if (pending.isPresent()) {
            var event = pending.get();
            return state(PetMood.THINKING, "Жду ответа по «" + event.getTitle() + "»",
                    PetStatusReason.AWAITING_APPROVAL, event);
        }
        // 8. Нет будущих встреч и активности за последние 14 дней. Для создания события считаем только автора.
        if (confirmed.isEmpty() && futureOrganized.isEmpty()
                && mine.stream().noneMatch(r -> recent(r.getCreatedAt(), now, Duration.ofDays(14)))
                && organized.stream().filter(e -> e.getAuthorId().equals(userId))
                        .noneMatch(e -> recent(e.getCreatedAt(), now, Duration.ofDays(14)))) {
            return state(PetMood.SLEEP, "Давно не тренировались… Найдём компанию?", PetStatusReason.INACTIVE, null);
        }
        // 9. Обычное состояние, с ближайшей подтверждённой встречей, если она есть.
        if (!confirmed.isEmpty()) {
            var event = confirmed.getFirst();
            return state(PetMood.IDLE, "Ближайшая встреча: «" + event.getTitle() + "» "
                    + date(event, starts.get(event.getId()), now), PetStatusReason.DEFAULT, event);
        }
        return state(PetMood.IDLE, "Найдём компанию для тренировки?", PetStatusReason.DEFAULT, null);
    }

    private static boolean active(Registration registration) {
        return registration.getStatus() == RegistrationStatus.CONFIRMED || registration.getStatus() == RegistrationStatus.PENDING;
    }

    private static boolean moderated(Event event, Instant now) {
        return event != null && (event.getStatus() == EventStatus.UNPUBLISHED || event.getStatus() == EventStatus.DELETED)
                && recent(event.getModeratedAt(), now, Duration.ofDays(7));
    }

    /** Окна включают обе границы и не принимают время из будущего. */
    private static boolean recent(Instant at, Instant now, Duration window) {
        return at != null && !at.isBefore(now.minus(window)) && !at.isAfter(now);
    }

    private static boolean future(Event event, Map<UUID, Instant> starts) {
        return event != null && event.getStatus() == EventStatus.PUBLISHED && starts.containsKey(event.getId());
    }

    private static String suffix(String reason) {
        return reason == null || reason.isBlank() ? "" : ": " + reason;
    }

    private static ZoneId zone(Event event) {
        return event.getTimeZone() == null ? DEFAULT_ZONE : ZoneId.of(event.getTimeZone());
    }

    private static String date(Event event, Instant start, Instant now) {
        var day = start.atZone(zone(event)).toLocalDate();
        var today = now.atZone(zone(event)).toLocalDate();
        if (day.equals(today)) return "сегодня";
        if (day.equals(today.plusDays(1))) return "завтра";
        return DATE.format(day);
    }

    private static String requests(long n) {
        if (n % 100 >= 11 && n % 100 <= 14) return "новых заявок";
        return switch ((int) (n % 10)) {
            case 1 -> "новая заявка";
            case 2, 3, 4 -> "новые заявки";
            default -> "новых заявок";
        };
    }

    private static PetStatusResponse state(PetMood mood, String message, PetStatusReason reason, Event event) {
        return new PetStatusResponse(mood, message, reason, event == null ? null : event.getId(),
                event == null ? null : event.getTitle());
    }
}
