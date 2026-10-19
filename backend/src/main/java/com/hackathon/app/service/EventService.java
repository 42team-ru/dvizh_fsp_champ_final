package com.hackathon.app.service;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.dto.EventFilter;
import com.hackathon.app.dto.EventRequest;
import com.hackathon.app.dto.EventResponse;
import com.hackathon.app.dto.EventSummaryResponse;
import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Event;
import com.hackathon.app.entity.Registration;
import com.hackathon.app.entity.Sport;
import com.hackathon.app.exception.BadRequestException;
import com.hackathon.app.exception.ConflictException;
import com.hackathon.app.exception.ForbiddenException;
import com.hackathon.app.exception.UnauthorizedException;
import com.hackathon.app.mapper.EventMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.EventSpecifications;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EventService {

    static final String NOT_FOUND = "Мероприятие не найдено";
    private static final int FEED_LIMIT = 100;

    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final SportRepository sports;
    private final AppUserRepository users;
    private final SportService sportService;
    private final DbTimeRepository dbTime;
    private final EventAccessPolicy policy;
    private final EventMapper mapper;

    /**
     * Лента: только опубликованные и ещё не начавшиеся (если from не задан), ближайшие первыми.
     */
    @Transactional(readOnly = true)
    public List<EventSummaryResponse> list(EventFilter f, UUID userId) {
        var from = f.from() != null ? f.from() : dbTime.now();
        var spec = EventSpecifications.feed(Strings.blankToNull(f.q()), f.sportId(), from, f.to(), f.level(),
                f.joinMode(), f.format());
        var found = events.findAll(spec, PageRequest.of(0, FEED_LIMIT, Sort.by("startAt"))).getContent();
        return summaries(found, userId);
    }

    /**
     * Мои мероприятия как организатора, во всех статусах.
     */
    @Transactional(readOnly = true)
    public List<EventSummaryResponse> mine(UUID userId) {
        return summaries(events.findByAuthorIdOrderByStartAtDesc(userId), userId);
    }

    /**
     * Карточка открывается в любом статусе (снятое — с причиной); что можно делать, говорит блок viewer.
     */
    @Transactional(readOnly = true)
    public EventResponse get(UUID eventId, UUID userId) {
        var e = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
        var sport = sportService.get(e.getSportId());
        var author = users.findById(e.getAuthorId()).orElseThrow();
        var participants = registrations.findUsers(eventId, Registration.Status.CONFIRMED);
        var my = registrations.findByEventIdAndUserId(eventId, userId).orElse(null);
        var now = dbTime.now();
        boolean canSee = policy.canSeePrivateDetails(e, userId, my);
        var viewer = mapper.toViewer(my != null ? my.getStatus() : null,
                policy.registerBlockedReason(e, userId, my, participants.size(), now),
                policy.isOrganizer(e, userId), policy.canManage(e, userId),
                policy.cancelBlockedReason(e, my, now) == null, canSee);
        return mapper.toResponse(e, sport, author, participants, participants.size(), viewer,
                canSee ? e.getOnlineUrl() : null, canSee ? e.getPrivateDetails() : null);
    }

    /**
     * Публикуется сразу. Админ не создаёт (403). Свой вид спорта создаётся в этой же транзакции.
     */
    @Transactional
    public EventResponse create(UUID userId, EventRequest r) {
        var user = users.findById(userId).filter(AppUser::isActive)
                .orElseThrow(() -> new UnauthorizedException("Сессия недействительна, войдите заново"));
        var blocked = policy.createBlockedReason(user);
        if (blocked != null) {
            throw new ForbiddenException(blocked);
        }
        validate(r);
        var sport = sportService.resolve(r.sportId(), r.sportName(), userId);
        var event = events.saveAndFlush(mapper.toEntity(r, userId, sport.getId()));
        return get(event.getId(), userId);
    }

    /**
     * Редактирует только организатор; удалённое — нельзя; лимит мест не меньше уже подтверждённых.
     */
    @Transactional
    public EventResponse update(UUID eventId, UUID userId, EventRequest r) {
        var e = events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
        if (!policy.isOrganizer(e, userId)) {
            throw new ForbiddenException("Редактировать мероприятие может только организатор");
        }
        if (!policy.canManage(e, userId)) {
            throw new ConflictException("Мероприятие удалено, редактировать нельзя");
        }
        validate(r);
        var confirmed = registrations.countByEventIdAndStatus(eventId, Registration.Status.CONFIRMED);
        if (r.capacity() != null && r.capacity() < confirmed) {
            throw new ConflictException("Уже записано " + confirmed + ", лимит мест не может быть меньше");
        }
        var sport = sportService.resolve(r.sportId(), r.sportName(), userId);
        mapper.update(e, r, sport.getId());
        events.saveAndFlush(e);
        return get(eventId, userId);
    }

    /**
     * Список для ленты и «моих»: счётчики и мои статусы — по одному запросу на весь список.
     */
    @Transactional(readOnly = true)
    public List<EventSummaryResponse> summaries(List<Event> list, UUID userId) {
        if (list.isEmpty()) {
            return List.of();
        }
        var ids = list.stream().map(Event::getId).toList();
        Map<UUID, Sport> sportsById = sports.findAllById(list.stream().map(Event::getSportId).distinct().toList())
                .stream().collect(Collectors.toMap(Sport::getId, Function.identity()));
        var counts = registrations.countByEventIds(ids, Registration.Status.CONFIRMED).stream()
                .collect(Collectors.toMap(RegistrationRepository.EventCount::getEventId,
                        RegistrationRepository.EventCount::getCount));
        var my = registrations.findByUserIdAndEventIdIn(userId, ids).stream()
                .collect(Collectors.toMap(Registration::getEventId, Registration::getStatus));
        return list.stream()
                .map(e -> mapper.toSummary(e, sportsById.get(e.getSportId()), counts.getOrDefault(e.getId(), 0L),
                        my.get(e.getId())))
                .toList();
    }

    private static void validate(EventRequest r) {
        if (r.endAt() != null && !r.endAt().isAfter(r.startAt())) {
            throw new BadRequestException("Окончание должно быть позже начала");
        }
        if (r.format() == Event.Format.OFFLINE && Strings.blankToNull(r.address()) == null) {
            throw new BadRequestException("Для очного мероприятия нужен адрес");
        }
    }
}
