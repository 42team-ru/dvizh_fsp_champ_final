package com.hackathon.app.service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.EventRegistrationResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.MyRegistrationResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.RegistrationResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.TimeScope;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.RegistrationMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.MineSpecifications;
import com.hackathon.app.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Запись на мероприятие и решения организатора. Все «можно ли» — в EventAccessPolicy.
 * Запись и одобрение идут под блокировкой строки мероприятия, поэтому последнее место не займут двое.
 */
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final RegistrationRepository registrations;
    private final EventRepository events;
    private final AppUserRepository users;
    private final EventService eventService;
    private final DbTimeRepository dbTime;
    private final EventAccessPolicy policy;
    private final RegistrationMapper mapper;
    private final OccurrenceService occurrences;
    private final NotificationChanges notificationChanges;
    private final WaitlistService waitlist;

    /**
     * FREE — сразу CONFIRMED, а если мест нет — WAITLISTED (лист ожидания); REQUEST — PENDING.
     * После отмены та же строка переиспользуется.
     * У серии это вступление в серию: на занятия участник отмечается отдельно (OccurrenceService.attend).
     */
    @Transactional
    public RegistrationResponse create(UUID eventId, UUID userId, String message) {
        var event = events.findByIdForUpdate(eventId)
                .orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        var user = users.findById(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        notificationChanges.watch(eventId, userId);
        var myRegistration = registrations.findByEventIdAndUserId(eventId, userId).orElse(null);
        var now = dbTime.now();
        var confirmedCount = registrations.countByEventIdAndStatus(eventId, RegistrationStatus.CONFIRMED);
        var blockedReason = policy.registerBlockedReason(event, user.getSystemRole(), userId, myRegistration, confirmedCount, now);
        if (blockedReason != null) {
            throw new ConflictException(blockedReason);
        }
        var status = policy.joinAs(event, confirmedCount);
        var decidedAt = status == RegistrationStatus.CONFIRMED ? now : null;
        var queuedAt = status == RegistrationStatus.WAITLISTED ? now : null;
        var registration = myRegistration == null
                ? mapper.toRegistration(eventId, userId, status, message, decidedAt, queuedAt)
                : mapper.rejoin(myRegistration, status, message, decidedAt, queuedAt);
        try {
            return mapper.toResponse(registrations.saveAndFlush(registration));
        } catch (DataIntegrityViolationException _) { // двойной клик: unique(event_id, user_id)
            throw new ConflictException("Вы уже записаны на это мероприятие");
        }
    }

    /**
     * Отмена своей записи или заявки; повторное нажатие ничего не меняет.
     * Выход из серии снимает будущие отметки на занятия, прошлые остаются.
     */
    @Transactional
    public RegistrationResponse cancel(UUID eventId, UUID userId) {
        var event = events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        var myRegistration = registrations.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new NoSuchElementException("Вы не записаны на это мероприятие"));
        if (myRegistration.getStatus() == RegistrationStatus.CANCELLED) {
            return mapper.toResponse(myRegistration);
        }
        notificationChanges.watch(eventId, userId);
        var now = dbTime.now();
        var blockedReason = policy.cancelBlockedReason(event, myRegistration, now);
        if (blockedReason != null) {
            throw new ConflictException(blockedReason);
        }
        boolean freedSeat = myRegistration.getStatus() == RegistrationStatus.CONFIRMED;
        var cancelled = registrations.saveAndFlush(mapper.cancel(myRegistration, now, userId));
        if (event.isRecurring()) {
            occurrences.dropFutureAttendance(eventId, userId, now);
        }
        if (freedSeat) {
            waitlist.promote(event, now);
        }
        return mapper.toResponse(cancelled);
    }

    /**
     * Участники и заявки — только организатору; status — необязательный фильтр.
     */
    @Transactional(readOnly = true)
    public List<EventRegistrationResponse> listForEvent(UUID eventId, UUID userId, RegistrationStatus status) {
        var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        if (!policy.isOrganizer(event, userId)) {
            throw new ForbiddenException("Заявки видит только организатор");
        }
        var eventRegistrations = status == null
                ? registrations.findByEventIdOrderByCreatedAt(eventId)
                : registrations.findByEventIdAndStatusOrderByCreatedAt(eventId, status);
        var participantIds = eventRegistrations.stream().map(Registration::getUserId).toList();
        var usersById = users.findAllById(participantIds).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
        return eventRegistrations.stream()
                .map(registration -> mapper.toEventRegistration(registration, usersById.get(registration.getUserId())))
                .toList();
    }

    /**
     * Подтвердить можно и ранее отклонённую заявку — так организатор исправляет ошибку.
     */
    @Transactional
    public RegistrationResponse approve(UUID registrationId, UUID userId) {
        var managed = managed(registrationId, userId);
        if (managed.registration().getStatus() == RegistrationStatus.CONFIRMED) {
            return mapper.toResponse(managed.registration());
        }
        var confirmedCount = registrations.countByEventIdAndStatus(managed.event().getId(),
                RegistrationStatus.CONFIRMED);
        var blockedReason = policy.approveBlockedReason(managed.event(), managed.registration(), confirmedCount, dbTime.now());
        if (blockedReason != null) {
            throw new ConflictException(blockedReason);
        }
        return decide(managed.registration(), RegistrationStatus.CONFIRMED, null, userId);
    }

    /**
     * Отклонить можно и подтверждённого (исключить из участников); причину участник увидит в своей записи.
     * Исключённый из серии теряет будущие отметки на занятия.
     */
    @Transactional
    public RegistrationResponse reject(UUID registrationId, UUID userId, String reason) {
        var managed = managed(registrationId, userId);
        var blockedReason = policy.rejectBlockedReason(managed.registration());
        if (blockedReason != null) {
            throw new ConflictException(blockedReason);
        }
        boolean freedSeat = managed.registration().getStatus() == RegistrationStatus.CONFIRMED;
        var response = decide(managed.registration(), RegistrationStatus.REJECTED, reason, userId);
        if (freedSeat) {
            waitlist.promote(managed.event(), dbTime.now());
        }
        if (managed.event().isRecurring()) {
            occurrences.dropFutureAttendance(managed.event().getId(), managed.registration().getUserId(),
                    dbTime.now());
        }
        return response;
    }

    /**
     * Мои записи со статусом мероприятия: снятое с публикации тоже видно. У серии — моё ближайшее отмеченное занятие.
     */
    @Transactional(readOnly = true)
    public PageResponse<MyRegistrationResponse> mine(UUID userId, RegistrationStatus status, TimeScope when, int page, int size) {
        var myRegistrations = registrations.findAll(MineSpecifications.registrations(userId, status, when, dbTime.now()),
                PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 100), Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        var eventIds = myRegistrations.getContent().stream().map(Registration::getEventId).toList();
        var eventList = events.findAllById(eventIds);
        var eventsById = eventService.summaries(eventList, userId).stream()
                .collect(Collectors.toMap(EventSummaryResponse::id, Function.identity()));
        var myNextByEventId = occurrences.myNext(userId, eventList, dbTime.now());
        return PageResponse.of(myRegistrations,
                registration -> mapper.toMine(registration, eventsById.get(registration.getEventId()),
                        myNextByEventId.get(registration.getEventId()), waitlist.position(registration)));
    }

    private RegistrationResponse decide(Registration registration, RegistrationStatus status, String reason,
                                        UUID userId) {
        var decided = mapper.decide(registration, status, reason, dbTime.now(), userId);
        return mapper.toResponse(registrations.saveAndFlush(decided));
    }

    private record ManagedRegistration(Registration registration, Event event) {
    }

    /**
     * Заявка + её мероприятие под блокировкой; решать может только организатор (админ — нет, правило 7).
     */
    private ManagedRegistration managed(UUID registrationId, UUID userId) {
        var registration = registrations.findById(registrationId)
                .orElseThrow(() -> new NoSuchElementException("Заявка не найдена"));
        var event = events.findByIdForUpdate(registration.getEventId()).orElseThrow();
        if (!policy.isOrganizer(event, userId)) {
            throw new ForbiddenException("Решение по заявке принимает только организатор");
        }
        if (!policy.canManage(event, userId)) {
            throw new ConflictException(policy.manageConflictReason(event, "Мероприятие удалено, решать заявки нельзя"));
        }
        notificationChanges.watch(event.getId(), userId);
        return new ManagedRegistration(registration, event);
    }
}
