package com.hackathon.app.service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.dto.EventRegistrationResponse;
import com.hackathon.app.dto.MyRegistrationResponse;
import com.hackathon.app.dto.RegistrationResponse;
import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Event;
import com.hackathon.app.entity.Registration;
import com.hackathon.app.exception.ConflictException;
import com.hackathon.app.exception.ForbiddenException;
import com.hackathon.app.mapper.RegistrationMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
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

    /**
     * FREE — сразу CONFIRMED, REQUEST — PENDING. После отмены та же строка переиспользуется.
     */
    @Transactional
    public RegistrationResponse create(UUID eventId, UUID userId, String message) {
        var e = events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        var my = registrations.findByEventIdAndUserId(eventId, userId).orElse(null);
        var now = dbTime.now();
        var confirmed = registrations.countByEventIdAndStatus(eventId, Registration.Status.CONFIRMED);
        var blocked = policy.registerBlockedReason(e, userId, my, confirmed, now);
        if (blocked != null) {
            throw new ConflictException(blocked);
        }
        boolean free = e.getJoinMode() == Event.JoinMode.FREE;
        var status = free ? Registration.Status.CONFIRMED : Registration.Status.PENDING;
        var decidedAt = free ? now : null;
        var registration = my == null
                ? mapper.toRegistration(eventId, userId, status, message, decidedAt)
                : mapper.rejoin(my, status, message, decidedAt);
        try {
            return mapper.toResponse(registrations.saveAndFlush(registration));
        } catch (DataIntegrityViolationException _) { // двойной клик: unique(event_id, user_id)
            throw new ConflictException("Вы уже записаны на это мероприятие");
        }
    }

    /**
     * Отмена своей записи или заявки; повторное нажатие ничего не меняет.
     */
    @Transactional
    public RegistrationResponse cancel(UUID eventId, UUID userId) {
        var e = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        var my = registrations.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new NoSuchElementException("Вы не записаны на это мероприятие"));
        if (my.getStatus() == Registration.Status.CANCELLED) {
            return mapper.toResponse(my);
        }
        var now = dbTime.now();
        var blocked = policy.cancelBlockedReason(e, my, now);
        if (blocked != null) {
            throw new ConflictException(blocked);
        }
        return mapper.toResponse(registrations.saveAndFlush(mapper.cancel(my, now, userId)));
    }

    /**
     * Участники и заявки — только организатору; status — необязательный фильтр.
     */
    @Transactional(readOnly = true)
    public List<EventRegistrationResponse> listForEvent(UUID eventId, UUID userId, Registration.Status status) {
        var e = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        if (!policy.isOrganizer(e, userId)) {
            throw new ForbiddenException("Заявки видит только организатор");
        }
        var list = status == null
                ? registrations.findByEventIdOrderByCreatedAt(eventId)
                : registrations.findByEventIdAndStatusOrderByCreatedAt(eventId, status);
        var usersById = users.findAllById(list.stream().map(Registration::getUserId).toList()).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
        return list.stream().map(r -> mapper.toEventRegistration(r, usersById.get(r.getUserId()))).toList();
    }

    /**
     * Подтвердить можно и ранее отклонённую заявку — так организатор исправляет ошибку.
     */
    @Transactional
    public RegistrationResponse approve(UUID registrationId, UUID userId) {
        var reg = managed(registrationId, userId);
        if (reg.registration().getStatus() == Registration.Status.CONFIRMED) {
            return mapper.toResponse(reg.registration());
        }
        var confirmed = registrations.countByEventIdAndStatus(reg.event().getId(), Registration.Status.CONFIRMED);
        var blocked = policy.approveBlockedReason(reg.event(), reg.registration(), confirmed);
        if (blocked != null) {
            throw new ConflictException(blocked);
        }
        return decide(reg.registration(), Registration.Status.CONFIRMED, null, userId);
    }

    /**
     * Отклонить можно и подтверждённого (исключить из участников); причину участник увидит в своей записи.
     */
    @Transactional
    public RegistrationResponse reject(UUID registrationId, UUID userId, String reason) {
        var reg = managed(registrationId, userId);
        var blocked = policy.rejectBlockedReason(reg.registration());
        if (blocked != null) {
            throw new ConflictException(blocked);
        }
        return decide(reg.registration(), Registration.Status.REJECTED, reason, userId);
    }

    /**
     * Мои записи со статусом мероприятия: снятое с публикации тоже видно.
     */
    @Transactional(readOnly = true)
    public List<MyRegistrationResponse> mine(UUID userId) {
        var list = registrations.findByUserIdOrderByCreatedAtDesc(userId);
        var eventsById = eventService.summaries(events.findAllById(list.stream().map(Registration::getEventId).toList()), userId)
                .stream().collect(Collectors.toMap(s -> s.id(), Function.identity()));
        return list.stream().map(r -> mapper.toMine(r, eventsById.get(r.getEventId()))).toList();
    }

    private RegistrationResponse decide(Registration registration, Registration.Status status, String reason, UUID userId) {
        return mapper.toResponse(registrations.saveAndFlush(mapper.decide(registration, status, reason, dbTime.now(), userId)));
    }

    private record Managed(Registration registration, Event event) {
    }

    /**
     * Заявка + её мероприятие под блокировкой; решать может только организатор (админ — нет, правило 7).
     */
    private Managed managed(UUID registrationId, UUID userId) {
        var reg = registrations.findById(registrationId).orElseThrow(() -> new NoSuchElementException("Заявка не найдена"));
        var e = events.findByIdForUpdate(reg.getEventId()).orElseThrow();
        if (!policy.canManage(e, userId)) {
            throw new ForbiddenException("Решение по заявке принимает только организатор");
        }
        return new Managed(reg, e);
    }
}
