package com.hackathon.app.service;

import static com.hackathon.app.util.NotificationTimes.stored;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.entity.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.repository.*;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Собирает изменения одной команды в транзакционный пакет. Снимки неизменяемые: JPA-сущности в них не попадают.
 * Сравнение выполняется перед commit после всех пересчётов серии и удаления будущих отметок.
 */
@Service
@RequiredArgsConstructor
public class NotificationChanges {
    private final EventRepository events;
    private final EventOccurrenceRepository occurrences;
    private final EventScheduleRuleRepository rules;
    private final EventOrganizerRepository organizers;
    private final RegistrationRepository registrations;
    private final OccurrenceAttendanceRepository attendances;
    private final StoredFileRepository files;
    private final EventAccessPolicy policy;
    private final NotificationPublisher publisher;
    private final NotificationReminderService reminders;
    private final EntityManager entityManager;
    private final DbTimeRepository dbTime;
    private final NotificationProperties properties;

    /** Регистрация до первой правки, обязательно после блокировки мероприятия. Повторный вызов в этой транзакции безопасен. */
    public void watch(UUID eventId, UUID actorId) {
        if (!TransactionSynchronizationManager.isActualTransactionActive())
            throw new IllegalStateException("Изменение мероприятия требует транзакции");
        if (TransactionSynchronizationManager.getSynchronizations().stream()
                .anyMatch(s -> s instanceof Change change && change.eventId.equals(eventId))) return;
        TransactionSynchronizationManager.registerSynchronization(new Change(eventId, actorId, snapshot(eventId)));
    }

    private final class Change implements TransactionSynchronization {
        private final UUID eventId;
        private final UUID actorId;
        private final Snapshot before;
        private Change(UUID eventId, UUID actorId, Snapshot before) {
            this.eventId = eventId; this.actorId = actorId; this.before = before;
        }
        @Override public void beforeCommit(boolean readOnly) {
            if (readOnly) return;
            entityManager.flush();
            var after = snapshot(eventId);
            reminders.synchronize(eventId);
            publisher.publish(diff(before, after, actorId));
        }
    }

    private record RegistrationState(UUID userId, RegistrationStatus status, String reason, Instant eligibleAt) {}
    private record Slot(UUID id, Instant start, Instant end, OccurrenceStatus status, String reason,
                        Instant confirmedAt, Map<UUID, Instant> attendees, QuorumStatus quorum) {}
    private record RuleContent(LocalDateTime firstStart, int durationMinutes, String rrule) {}
    private record CardContent(String title, String description, UUID sportId, EventFormat format, String address,
            String locationNote, String onlineUrl, Double lat, Double lon, EventLevel level, EventKind kind,
            String requirements, String equipment, Integer capacity, Integer minParticipants, JoinMode joinMode,
            String privateDetails, String timeZone, LocalDate seriesStartDate, LocalDate seriesEndDate,
            Instant startAt, Instant endAt, List<RuleContent> rules, List<UUID> photos) {}
    private record Snapshot(UUID id, UUID authorId, String title, String zone, boolean recurring,
                            EventStatus status, String reason, CardContent content,
                            Map<UUID, RegistrationState> registrations, Map<UUID, Instant> organizers,
                            Map<UUID, Slot> slots) {}

    private Snapshot snapshot(UUID eventId) {
        var event = events.findById(eventId).orElseThrow();
        var registrationStates = new HashMap<UUID, RegistrationState>();
        registrations.findByEventIdOrderByCreatedAt(eventId).forEach(r -> registrationStates.put(r.getUserId(),
                new RegistrationState(r.getUserId(), r.getStatus(), r.getDecisionReason(),
                        r.getDecidedAt() == null ? r.getCreatedAt() : r.getDecidedAt())));
        var organizerStates = new HashMap<UUID, Instant>();
        organizerStates.put(event.getAuthorId(), event.getCreatedAt());
        organizers.findByEventIdOrderByCreatedAt(eventId).forEach(o -> organizerStates.put(o.getUserId(), o.getCreatedAt()));
        var attendanceBySlot = event.isRecurring() ? attendances.findByEventId(eventId).stream()
                .collect(Collectors.groupingBy(OccurrenceAttendance::getOccurrenceId)) : Map.<UUID, List<OccurrenceAttendance>>of();
        var slots = new LinkedHashMap<UUID, Slot>();
        for (var occurrence : occurrences.findByEventIdOrderByStartAt(eventId)) {
            var attending = new HashMap<UUID, Instant>();
            if (event.isRecurring()) {
                attendanceBySlot.getOrDefault(occurrence.getId(), List.of()).forEach(a -> attending.put(a.getUserId(), a.getCreatedAt()));
            } else registrationStates.values().stream().filter(r -> r.status() == RegistrationStatus.CONFIRMED)
                    .forEach(r -> attending.put(r.userId(), r.eligibleAt()));
            slots.put(occurrence.getId(), new Slot(occurrence.getId(), stored(occurrence.getStartAt()), stored(occurrence.getEndAt()),
                    occurrence.getStatus(), occurrence.getCancelReason(), occurrence.getConfirmedAt(), Map.copyOf(attending),
                    policy.quorumStatus(event, occurrence, attending.size())));
        }
        var content = new CardContent(event.getTitle(), event.getDescription(), event.getSportId(),
                event.getFormat(), event.getAddress(), event.getLocationNote(), event.getOnlineUrl(), event.getLat(), event.getLon(),
                event.getLevel(), event.getKind(), event.getRequirements(), event.getEquipment(), event.getCapacity(),
                event.getMinParticipants(), event.getJoinMode(), event.getPrivateDetails(), event.getTimeZone(),
                event.getSeriesStartDate(), event.getSeriesEndDate(), event.isRecurring() ? null : stored(event.getStartAt()),
                event.isRecurring() ? null : stored(event.getEndAt()),
                rules.findByEventIdOrderBySortOrder(eventId).stream()
                        .map(r -> new RuleContent(r.getFirstStart(), r.getDurationMinutes(), r.getRrule())).toList(),
                files.findByEventIdAndKindOrderByPositionAscCreatedAtAsc(eventId, FileKind.EVENT_PHOTO).stream()
                        .map(StoredFile::getId).toList());
        return new Snapshot(eventId, event.getAuthorId(), event.getTitle(), event.getTimeZone(), event.isRecurring(),
                event.getStatus(), event.getModerationReason(), content,
                Map.copyOf(registrationStates), Map.copyOf(organizerStates), Collections.unmodifiableMap(slots));
    }

    private List<NotificationFact> diff(Snapshot before, Snapshot after, UUID actorId) {
        var result = new ArrayList<NotificationFact>();
        String command = UUID.randomUUID().toString();
        var now = dbTime.now();
        boolean moderated = before.status() != after.status() || !Objects.equals(before.reason(), after.reason());
        boolean cardChanged = !before.content().equals(after.content());
        boolean datesAdded = after.slots().keySet().stream().anyMatch(id -> !before.slots().containsKey(id));
        if (moderated) {
            var type = switch (after.status()) {
                case DELETED -> NotificationType.EVENT_DELETED;
                case PUBLISHED -> NotificationType.EVENT_RESTORED;
                case UNPUBLISHED -> NotificationType.EVENT_UNPUBLISHED;
            };
            var title = switch (type) {
                case EVENT_DELETED -> "Мероприятие удалено";
                case EVENT_RESTORED -> "Мероприятие снова опубликовано";
                default -> "Мероприятие снято с публикации";
            };
            add(result, command, after, actorId, type, NotificationCategory.EVENTS, audience(after), null, title, after.reason());
        } else if (cardChanged || datesAdded) {
            var affected = after.slots().values().stream().filter(s -> {
                var old = before.slots().get(s.id());
                return old == null || !old.start().equals(s.start()) || !Objects.equals(old.end(), s.end()) || old.status() != s.status();
            }).map(s -> time(after, s.start()) + (s.status() == OccurrenceStatus.CANCELLED ? " — отменено" : ""))
                    .limit(20).collect(Collectors.joining("; "));
            add(result, command, after, actorId, NotificationType.EVENT_CHANGED, NotificationCategory.EVENTS,
                    audience(after), null, "Мероприятие изменено", affected.isEmpty() ? "Обновлена карточка мероприятия." : "Изменения расписания: " + affected);
        }
        for (var slot : after.slots().values()) {
            var old = before.slots().get(slot.id());
            if (old == null) continue;
            if (!moderated && !cardChanged && !datesAdded) {
                if (old.status() != slot.status() && slot.status() == OccurrenceStatus.CANCELLED)
                    add(result, command, after, actorId, NotificationType.OCCURRENCE_CANCELLED, NotificationCategory.EVENTS,
                            slotAudience(after, slot), slot, "Занятие отменено", slot.reason());
                else if (!old.start().equals(slot.start()) || !Objects.equals(old.end(), slot.end()))
                    add(result, command, after, actorId, NotificationType.OCCURRENCE_RESCHEDULED, NotificationCategory.EVENTS,
                            slotAudience(after, slot), slot, "Занятие перенесено", "Было: " + time(before, old.start()) + ". Стало: " + time(after, slot.start()));
            }
            if (after.status() != EventStatus.PUBLISHED || slot.status() != OccurrenceStatus.SCHEDULED
                    || !slot.start().isAfter(now)) continue;
            if (old.confirmedAt() == null && slot.confirmedAt() != null)
                add(result, command, after, actorId, NotificationType.OCCURRENCE_CONFIRMED, NotificationCategory.EVENTS,
                        participantAudience(after, slot), slot, "Организатор подтвердил: занятие состоится", null);
            else if (old.quorum() != slot.quorum() && old.quorum() != null && slot.quorum() != null
                    && slot.confirmedAt() == null) {
                var reached = slot.quorum() == QuorumStatus.REACHED;
                add(result, command, after, actorId, reached ? NotificationType.QUORUM_REACHED : NotificationType.QUORUM_LOST,
                        NotificationCategory.EVENTS, participantAudience(after, slot), slot,
                        reached ? "Кворум набран" : "Пока не хватает участников", "Участников: " + slot.attendees().size() + ". Отмену определяет организатор.");
            }
        }
        for (var registration : after.registrations().values()) {
            var old = before.registrations().get(registration.userId());
            if (old != null && old.status() == registration.status() && Objects.equals(old.reason(), registration.reason())) continue;
            var status = registration.status();
            boolean joined = old == null || old.status() == RegistrationStatus.CANCELLED;
            if (joined && (status == RegistrationStatus.PENDING || status == RegistrationStatus.CONFIRMED))
                add(result, command + ":" + registration.userId(), after, actorId, NotificationType.REGISTRATION_CREATED,
                        NotificationCategory.REGISTRATIONS, after.organizers().keySet(), null,
                        status == RegistrationStatus.PENDING ? "Новая заявка на участие" : "Новый участник", null);
            else if (status == RegistrationStatus.CANCELLED && old != null && old.status() != RegistrationStatus.WAITLISTED)
                add(result, command + ":" + registration.userId(), after, actorId, NotificationType.REGISTRATION_CANCELLED,
                        NotificationCategory.REGISTRATIONS, after.organizers().keySet(), null, "Участник отменил запись", null);
            else if (status == RegistrationStatus.CONFIRMED || status == RegistrationStatus.REJECTED)
                add(result, command, after, actorId,
                        status == RegistrationStatus.CONFIRMED ? NotificationType.REGISTRATION_APPROVED : NotificationType.REGISTRATION_REJECTED,
                        NotificationCategory.REGISTRATIONS, Set.of(registration.userId()), null,
                        status == RegistrationStatus.REJECTED ? "Ваша заявка отклонена или участие прекращено"
                                : old != null && old.status() == RegistrationStatus.WAITLISTED ? "Освободилось место — вы записаны"
                                : "Ваша запись подтверждена", registration.reason());
        }
        for (var id : after.organizers().keySet()) if (!before.organizers().containsKey(id))
            add(result, command, after, actorId, NotificationType.ORGANIZER_ADDED, NotificationCategory.ORGANIZERS,
                    Set.of(id), null, "Вы добавлены в организаторы", null);
        for (var id : before.organizers().keySet()) if (!after.organizers().containsKey(id))
            add(result, command, after, actorId, NotificationType.ORGANIZER_REMOVED, NotificationCategory.ORGANIZERS,
                    id.equals(actorId) ? Set.of(after.authorId()) : Set.of(id), null, "Изменился состав организаторов", null);
        return result;
    }

    private Set<UUID> audience(Snapshot event) {
        var ids = new HashSet<>(event.organizers().keySet());
        event.registrations().values().stream().filter(r -> r.status() == RegistrationStatus.CONFIRMED
                        || r.status() == RegistrationStatus.PENDING || r.status() == RegistrationStatus.WAITLISTED)
                .forEach(r -> ids.add(r.userId()));
        return ids;
    }
    private Set<UUID> slotAudience(Snapshot event, Slot slot) {
        if (!event.recurring()) return audience(event);
        var ids = new HashSet<>(event.organizers().keySet()); ids.addAll(slot.attendees().keySet()); return ids;
    }
    private Set<UUID> participantAudience(Snapshot event, Slot slot) {
        var ids = new HashSet<>(event.organizers().keySet()); ids.addAll(slot.attendees().keySet()); return ids;
    }
    private void add(List<NotificationFact> facts, String command, Snapshot event, UUID actor, NotificationType type,
                     NotificationCategory category, Set<UUID> ids, Slot slot, String title, String detail) {
        String body = event.title() + (slot == null ? "" : " · " + time(event, slot.start()))
                + (detail == null || detail.isBlank() ? "" : "\n" + detail);
        facts.add(new NotificationFact(command + ":" + type + ":" + (slot == null ? "event" : slot.id()), Set.copyOf(ids),
                actor, type, category, title, body.length() > 3800 ? body.substring(0, 3800) : body,
                "/events/" + event.id(), event.id(), slot == null ? null : slot.id(), null, null));
    }
    private String time(Snapshot event, Instant instant) {
        return DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm VV")
                .withZone(ZoneId.of(event.zone() == null ? properties.timeZone() : event.zone())).format(instant);
    }
}
