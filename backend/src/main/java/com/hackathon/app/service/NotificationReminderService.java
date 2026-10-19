package com.hackathon.app.service;

import static com.hackathon.app.util.NotificationTimes.stored;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.entity.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.domain.mapper.NotificationMapper;
import com.hackathon.app.repository.*;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Планирование по занятиям; просроченные интервалы при позднем вступлении не догоняются. */
@Service
@RequiredArgsConstructor
public class NotificationReminderService {
    private final NotificationReminderRepository reminders;
    private final EventRepository events;
    private final EventOccurrenceRepository occurrences;
    private final RegistrationRepository registrations;
    private final OccurrenceAttendanceRepository attendances;
    private final EventOrganizerRepository organizers;
    private final NotificationMapper mapper;
    private final NotificationPublisher publisher;
    private final DbTimeRepository dbTime;
    private final NotificationProperties properties;
    private final MeterRegistry metrics;

    @Transactional
    public void synchronize(UUID eventId) {
        var event = events.findByIdForUpdate(eventId).orElseThrow();
        var now = dbTime.now();
        var slots = occurrences.findByEventIdOrderByStartAt(eventId);
        var slotIds = slots.stream().map(EventOccurrence::getId).collect(java.util.stream.Collectors.toSet());
        var allActive = reminders.findByEventIdAndFinishedAtIsNull(eventId);
        var activeBySlot = allActive.stream().collect(java.util.stream.Collectors.groupingBy(NotificationReminder::getOccurrenceId));
        // При пересчёте серии занятие без участников может быть физически удалено.
        allActive.stream()
                .filter(r -> !slotIds.contains(r.getOccurrenceId())).forEach(r -> mapper.finishReminder(r, now));
        for (var slot : slots) {
            var active = activeBySlot.getOrDefault(slot.getId(), List.of());
            boolean valid = event.getStatus() == EventStatus.PUBLISHED && slot.getStatus() == OccurrenceStatus.SCHEDULED;
            active.stream().filter(r -> !valid || !r.getExpectedStartAt().equals(stored(slot.getStartAt())))
                    .forEach(r -> mapper.finishReminder(r, now));
            if (!valid) continue;
            for (int offset : new LinkedHashSet<>(properties.reminderOffsetsMinutes())) {
                var due = stored(slot.getStartAt()).minusSeconds(offset * 60L);
                if (!due.isAfter(now) || active.stream().anyMatch(r -> r.getFinishedAt() == null
                        && r.getExpectedStartAt().equals(stored(slot.getStartAt())) && r.getOffsetMinutes() == offset)) continue;
                reminders.save(mapper.reminder(eventId, slot.getId(), stored(slot.getStartAt()), offset, due, UUID.randomUUID().toString()));
            }
        }
    }

    public List<UUID> due() {
        return reminders.due(dbTime.now(), PageRequest.of(0, 100));
    }

    @Transactional
    public void process(UUID id) {
        var eventId = reminders.findEventId(id).orElse(null);
        if (eventId == null) return;
        var event = events.findByIdForUpdate(eventId).orElse(null);
        var reminder = reminders.lock(id).orElse(null);
        if (reminder == null || reminder.getFinishedAt() != null) return;
        var now = dbTime.now();
        if (reminder.getDueAt().isAfter(now)) return;
        var slot = occurrences.findById(reminder.getOccurrenceId()).orElse(null);
        if (event == null || slot == null || event.getStatus() != EventStatus.PUBLISHED
                || slot.getStatus() != OccurrenceStatus.SCHEDULED || !stored(slot.getStartAt()).equals(reminder.getExpectedStartAt())
                || !stored(slot.getStartAt()).isAfter(now) || reminder.getDueAt().plusSeconds(properties.reminderGraceSeconds()).isBefore(now)) {
            mapper.finishReminder(reminder, now);
            metrics.counter("notifications.reminders.skipped").increment();
            return;
        }
        var recipients = new HashSet<UUID>();
        if (eligible(event.getCreatedAt(), reminder)) recipients.add(event.getAuthorId());
        organizers.findByEventIdOrderByCreatedAt(event.getId()).stream().filter(o -> eligible(o.getCreatedAt(), reminder))
                .forEach(o -> recipients.add(o.getUserId()));
        if (event.isRecurring()) {
            attendances.findByOccurrenceId(slot.getId()).stream().filter(a -> eligible(a.getCreatedAt(), reminder))
                    .filter(a -> registrations.findByEventIdAndUserId(event.getId(), a.getUserId())
                            .map(r -> r.getStatus() == RegistrationStatus.CONFIRMED).orElse(false))
                    .forEach(a -> recipients.add(a.getUserId()));
        } else registrations.findByEventIdAndStatusOrderByCreatedAt(event.getId(), RegistrationStatus.CONFIRMED).stream()
                .filter(r -> eligible(r.getDecidedAt() == null ? r.getCreatedAt() : r.getDecidedAt(), reminder))
                .forEach(r -> recipients.add(r.getUserId()));
        String time = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm VV")
                .withZone(ZoneId.of(event.getTimeZone() == null ? properties.timeZone() : event.getTimeZone())).format(stored(slot.getStartAt()));
        publisher.publish(List.of(new NotificationFact("reminder:" + reminder.getId(), Set.copyOf(recipients), null,
                NotificationType.REMINDER, NotificationCategory.REMINDERS,
                "Напоминание: скоро начало", event.getTitle() + " · " + time + "\nДо начала: " + reminder.getOffsetMinutes() + " мин.",
                "/events/" + event.getId(), event.getId(), slot.getId(), null, stored(slot.getStartAt()))));
        mapper.finishReminder(reminder, now);
    }

    private boolean eligible(Instant joinedAt, NotificationReminder reminder) {
        return joinedAt != null && !joinedAt.isAfter(reminder.getDueAt());
    }
}
