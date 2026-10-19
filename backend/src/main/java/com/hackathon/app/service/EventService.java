package com.hackathon.app.service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.dto.CreateEventRequest;
import com.hackathon.app.dto.EventRegistrationResponse;
import com.hackathon.app.dto.EventResponse;
import com.hackathon.app.dto.ParticipantResponse;
import com.hackathon.app.dto.RegistrationResponse;
import com.hackathon.app.dto.SportResponse;
import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Event;
import com.hackathon.app.entity.Registration;
import com.hackathon.app.exception.BadRequestException;
import com.hackathon.app.exception.ConflictException;
import com.hackathon.app.exception.ForbiddenException;
import com.hackathon.app.mapper.EventMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EventService {

    private static final String NOT_FOUND = "Мероприятие не найдено";

    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final SportRepository sports;
    private final AppUserRepository users;
    private final DbTimeRepository dbTime;
    private final EventMapper mapper;

    @Transactional(readOnly = true)
    public List<SportResponse> sports() {
        return sports.findAllByOrderByNameAsc().stream().map(mapper::toResponse).toList();
    }

    /**
     * Организацию пока не принимаем: членство в ней ещё нечем проверить.
     */
    @Transactional
    public EventResponse create(UUID authorId, CreateEventRequest r) {
        var sport = sports.findById(r.sportId()).orElseThrow(() -> new BadRequestException("Неизвестный вид спорта"));
        if (r.endAt() != null && !r.endAt().isAfter(r.startAt())) {
            throw new BadRequestException("Окончание должно быть позже начала");
        }
        if (r.offlineMode() && Strings.blankToNull(r.address()) == null) {
            throw new BadRequestException("Для офлайн-мероприятия нужен адрес");
        }
        var event = events.saveAndFlush(mapper.toEntity(r, authorId));
        return mapper.toResponse(event, sport, 0, null);
    }

    @Transactional(readOnly = true)
    public EventResponse get(UUID eventId, UUID userId) {
        var event = visible(eventId, userId);
        var sport = sports.findById(event.getSportId()).orElseThrow();
        var count = registrations.countByEventIdAndStatus(eventId, Registration.Status.CONFIRMED);
        var my = registrations.findByEventIdAndUserId(eventId, userId).map(Registration::getStatus).orElse(null);
        return mapper.toResponse(event, sport, count, my);
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> participants(UUID eventId, UUID userId) {
        visible(eventId, userId);
        return registrations.findUsers(eventId, Registration.Status.CONFIRMED).stream().map(mapper::toParticipant).toList();
    }

    /**
     * FREE — сразу CONFIRMED, REQUEST — PENDING (решает организатор). Строка мероприятия блокируется,
     * поэтому подсчёт мест и запись идут атомарно. Отменённую ранее запись можно возобновить, отклонённую — нет.
     */
    @Transactional
    public RegistrationResponse join(UUID eventId, UUID userId, String message) {
        var e = events.findByIdForUpdate(eventId)
                .filter(ev -> ev.getStatus() == Event.Status.PUBLISHED)
                .orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
        if (e.getAuthorId().equals(userId)) {
            throw new ConflictException("Организатор не может записаться на своё мероприятие");
        }
        var now = dbTime.now();
        if (!e.getStartAt().isAfter(now)) {
            throw new ConflictException("Мероприятие уже началось, запись закрыта");
        }
        var reg = registrations.findByEventIdAndUserId(eventId, userId).orElse(null);
        if (reg != null) {
            switch (reg.getStatus()) {
                case CONFIRMED -> throw new ConflictException("Вы уже записаны на это мероприятие");
                case PENDING -> throw new ConflictException("Заявка уже отправлена и ждёт решения организатора");
                // повторно подать нельзя (иначе отказ ничего не значит); ошибку исправляет организатор через decide
                case REJECTED -> throw new ConflictException("Организатор отклонил вашу заявку. Если это ошибка, свяжитесь с организатором");
                case CANCELLED -> {
                } // запись возобновляется ниже
            }
        }
        if (e.getCapacity() != null
                && registrations.countByEventIdAndStatus(eventId, Registration.Status.CONFIRMED) >= e.getCapacity()) {
            throw new ConflictException("Свободных мест нет");
        }
        boolean free = e.getJoinMode() == Event.JoinMode.FREE;
        var status = free ? Registration.Status.CONFIRMED : Registration.Status.PENDING;
        var decidedAt = free ? now : null;
        var registration = reg == null
                ? mapper.toRegistration(eventId, userId, status, message, decidedAt)
                : mapper.rejoin(reg, status, message, decidedAt);
        try {
            return mapper.toResponse(registrations.saveAndFlush(registration));
        } catch (DataIntegrityViolationException _) { // двойной клик: unique(event_id, user_id)
            throw new ConflictException("Вы уже записаны на это мероприятие");
        }
    }

    /**
     * Пользователь отменяет свою запись или заявку и освобождает место; потом может снова записаться через join.
     * Отклонённую заявку отменить нельзя: иначе отмена + повторная запись обходили бы отказ организатора.
     */
    @Transactional
    public RegistrationResponse cancel(UUID eventId, UUID userId) {
        var e = visible(eventId, userId);
        var reg = registrations.findByEventIdAndUserId(eventId, userId)
                .orElseThrow(() -> new NoSuchElementException("Вы не записаны на это мероприятие"));
        switch (reg.getStatus()) {
            case CANCELLED -> {
                return mapper.toResponse(reg); // повторное нажатие
            }
            case REJECTED -> throw new ConflictException("Заявка отклонена организатором, отменять нечего");
            case CONFIRMED, PENDING -> {
            }
        }
        var now = dbTime.now();
        if (!e.getStartAt().isAfter(now)) {
            throw new ConflictException("Мероприятие уже началось, отменить запись нельзя");
        }
        return mapper.toResponse(registrations.saveAndFlush(mapper.cancel(reg, now)));
    }

    /**
     * Все заявки мероприятия (или с одним статусом) — только для организатора: найти и пересмотреть решение.
     */
    @Transactional(readOnly = true)
    public List<EventRegistrationResponse> registrations(UUID eventId, UUID userId, Registration.Status status) {
        organizerEvent(events.findById(eventId), userId);
        var list = status == null
                ? registrations.findByEventIdOrderByCreatedAt(eventId)
                : registrations.findByEventIdAndStatusOrderByCreatedAt(eventId, status);
        var usersById = users.findAllById(list.stream().map(Registration::getUserId).toList()).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
        return list.stream().map(r -> mapper.toEventRegistration(r, usersById.get(r.getUserId()))).toList();
    }

    /**
     * Организатор принимает или отклоняет заявку и может в любой момент пересмотреть решение:
     * случайно отклонённого — подтвердить, подтверждённого — отклонить. Отменённую самим пользователем запись не трогаем.
     * Подтверждение занимает место, поэтому лимит проверяется под той же блокировкой строки мероприятия, что и в join.
     */
    @Transactional
    public RegistrationResponse decide(UUID eventId, UUID registrationId, UUID userId, Registration.Status status) {
        if (status != Registration.Status.CONFIRMED && status != Registration.Status.REJECTED) {
            throw new BadRequestException("Решение по заявке: только CONFIRMED или REJECTED");
        }
        var e = organizerEvent(events.findByIdForUpdate(eventId), userId);
        var reg = registrations.findById(registrationId)
                .filter(r -> r.getEventId().equals(eventId))
                .orElseThrow(() -> new NoSuchElementException("Заявка не найдена"));
        if (reg.getStatus() == status) {
            return mapper.toResponse(reg);
        }
        if (reg.getStatus() == Registration.Status.CANCELLED) {
            throw new ConflictException("Участник сам отменил запись");
        }
        if (status == Registration.Status.CONFIRMED && e.getCapacity() != null
                && registrations.countByEventIdAndStatus(eventId, Registration.Status.CONFIRMED) >= e.getCapacity()) {
            throw new ConflictException("Свободных мест нет");
        }
        return mapper.toResponse(registrations.saveAndFlush(mapper.decide(reg, status, dbTime.now())));
    }

    /**
     * Удалённое мероприятие — 404; чужое — 403.
     */
    private Event organizerEvent(Optional<Event> event, UUID userId) {
        var e = event.filter(ev -> ev.getStatus() != Event.Status.DELETED)
                .orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
        if (!e.getAuthorId().equals(userId)) {
            throw new ForbiddenException("Управлять заявками может только организатор");
        }
        return e;
    }

    /**
     * Неопубликованное мероприятие видит только автор, остальным оно «не существует».
     */
    private Event visible(UUID eventId, UUID userId) {
        return events.findById(eventId)
                .filter(e -> e.getStatus() == Event.Status.PUBLISHED
                        || (e.getStatus() == Event.Status.UNPUBLISHED && e.getAuthorId().equals(userId)))
                .orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
    }
}
