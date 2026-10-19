package com.hackathon.app.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.AdminEventResponse;
import com.hackathon.app.domain.dto.AdminStatsResponse;
import com.hackathon.app.domain.dto.DailyCountResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.EventMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.CommentRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Модерация мероприятий и дашборд. Роль ADMIN проверяет SecurityConfig (/api/admin/**).
 * Снятое и удалённое пропадает из ленты, запись закрывается, а записи участников остаются: они видят статус и причину.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminEventService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_STATS_DAYS = 366;
    /** Платформа для Красноярска: «10 октября» на графике — красноярские сутки. */
    private static final ZoneId CITY_ZONE = ZoneId.of("Asia/Krasnoyarsk");

    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final OrganizationRepository organizations;
    private final CommentRepository comments;
    private final SportRepository sports;
    private final NotificationChanges notificationChanges;
    private final AppUserRepository users;
    private final DbTimeRepository dbTime;
    private final EventAccessPolicy policy;
    private final EventMapper mapper;

    /**
     * Новые сверху; q ищет по названию без учёта регистра, status необязателен.
     */
    @Transactional(readOnly = true)
    public PageResponse<AdminEventResponse> list(EventStatus status, String q, int page, int size) {
        var query = Strings.blankToNull(q);
        var pattern = query == null ? "%" : "%" + query.toLowerCase() + "%";
        var pageable = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        var result = events.search(status, pattern, pageable);
        var eventList = result.getContent();
        var sportsById = sports.findAllById(eventList.stream().map(Event::getSportId).distinct().toList()).stream()
                .collect(Collectors.toMap(Sport::getId, Function.identity()));
        var authorsById = users.findAllById(eventList.stream().map(Event::getAuthorId).distinct().toList()).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
        var confirmedByEventId = eventList.isEmpty() ? Map.<UUID, Long>of()
                : registrations.countByEventIds(eventList.stream().map(Event::getId).toList(), RegistrationStatus.CONFIRMED)
                        .stream().collect(Collectors.toMap(RegistrationRepository.EventCount::getEventId,
                                RegistrationRepository.EventCount::getCount));
        return PageResponse.of(result, event -> mapper.toAdmin(event, sportsById.get(event.getSportId()),
                authorsById.get(event.getAuthorId()), confirmedByEventId.getOrDefault(event.getId(), 0L)));
    }

    /**
     * Повторное снятие только обновляет причину. Удалённое снять нельзя (409).
     */
    @Transactional
    public AdminEventResponse unpublish(UUID eventId, UUID adminId, String reason) {
        var event = findForUpdate(eventId);
        notificationChanges.watch(eventId, adminId);
        var blockedReason = policy.unpublishBlockedReason(event);
        if (blockedReason != null) {
            throw new ConflictException(blockedReason);
        }
        return moderate(event, EventStatus.UNPUBLISHED, reason, adminId);
    }

    /**
     * Мягкое удаление: строка остаётся, записавшиеся видят «Удалено» и причину. Повторное удаление обновляет причину.
     */
    @Transactional
    public AdminEventResponse delete(UUID eventId, UUID adminId, String reason) {
        var event = findForUpdate(eventId);
        notificationChanges.watch(eventId, adminId);
        return moderate(event, EventStatus.DELETED, reason, adminId);
    }

    /**
     * Счётчики и регистрации по дням за последние days дней, включая сегодня (по Красноярску).
     */
    @Transactional(readOnly = true)
    public AdminStatsResponse stats(int days) {
        var period = Math.clamp(days, 1, MAX_STATS_DAYS);
        var today = LocalDate.ofInstant(dbTime.now(), CITY_ZONE);
        var firstDay = today.minusDays(period - 1L);
        var signupsByDate = users.findCreatedAtSince(firstDay.atStartOfDay(CITY_ZONE).toInstant()).stream()
                .collect(Collectors.groupingBy(createdAt -> LocalDate.ofInstant(createdAt, CITY_ZONE),
                        Collectors.counting()));
        var signupsByDay = firstDay.datesUntil(today.plusDays(1))
                .map(day -> new DailyCountResponse(day, signupsByDate.getOrDefault(day, 0L)))
                .toList();
        return new AdminStatsResponse(
                users.count(),
                organizations.countByStatus(OrganizationStatus.PENDING),
                organizations.countByStatus(OrganizationStatus.APPROVED),
                events.countByStatus(EventStatus.PUBLISHED),
                events.countByStatus(EventStatus.UNPUBLISHED),
                events.countByStatus(EventStatus.DELETED),
                registrations.countByStatus(RegistrationStatus.CONFIRMED),
                registrations.countByStatus(RegistrationStatus.PENDING),
                comments.count(),
                signupsByDay);
    }

    /** Под блокировкой строки: снятие не разминётся с параллельной записью на последнее место. */
    private Event findForUpdate(UUID eventId) {
        return events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
    }

    private AdminEventResponse moderate(Event event, EventStatus status, String reason, UUID adminId) {
        mapper.moderate(event, status, reason, dbTime.now(), adminId);
        events.saveAndFlush(event);
        log.info("Модерация мероприятия: eventId={}, adminId={}, status={}", event.getId(), adminId, status);
        return mapper.toAdmin(event, sports.findById(event.getSportId()).orElseThrow(),
                users.findById(event.getAuthorId()).orElseThrow(),
                registrations.countByEventIdAndStatus(event.getId(), RegistrationStatus.CONFIRMED));
    }
}
