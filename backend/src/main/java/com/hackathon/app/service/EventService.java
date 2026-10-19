package com.hackathon.app.service;

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import com.hackathon.app.domain.dto.EventFilter;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.dto.EventResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.exception.UnauthorizedException;
import com.hackathon.app.domain.mapper.EventMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventFeedRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.EventSpecifications;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.StoredFileRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EventService {

    static final String NOT_FOUND = "Мероприятие не найдено";
    private static final int FEED_LIMIT = 100;
    private static final int MAX_PHOTOS = 6;

    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final AppUserRepository users;
    private final SportService sportService;
    private final EventOrganizerService organizerService;
    private final DbTimeRepository dbTime;
    private final EventAccessPolicy policy;
    private final EventMapper mapper;
    private final OrganizationService organizations;
    private final FileService files;
    private final StoredFileRepository storedFiles;
    private final EventListLookups listLookups;
    private final EventFeedRepository feed;
    private final OccurrenceService occurrenceService;
    private final ScheduleExpander expander;

    /**
     * Лента: только опубликованные, у которых есть занятие в периоде (без from — ещё не начавшееся), ближайшие первыми.
     * Серия — одна карточка с ближайшим подходящим занятием.
     */
    @Transactional(readOnly = true)
    public List<EventSummaryResponse> list(EventFilter filter, UUID userId) {
        var startFrom = filter.from() != null ? filter.from() : dbTime.now();
        var feedSpec = EventSpecifications.feed(Strings.blankToNull(filter.searchText()), filter.sportId(),
                filter.level(), filter.joinMode(), filter.format(), filter.organizationId());
        var ids = feed.findIds(feedSpec, startFrom, filter.to(), FEED_LIMIT);
        return summaries(EventListLookups.sortedLike(events.findAllById(ids), ids), userId, startFrom, filter.to());
    }

    /**
     * Мои мероприятия как организатора, во всех статусах.
     */
    @Transactional(readOnly = true)
    public List<EventSummaryResponse> mine(UUID userId) {
        return summaries(events.findOrganizedBy(userId), userId);
    }

    /**
     * Карточка открывается в любом статусе (снятое — с причиной); что можно делать, говорит блок viewer.
     */
    @Transactional(readOnly = true)
    public EventResponse get(UUID eventId, UUID userId) {
        var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
        var sport = sportService.get(event.getSportId());
        var author = users.findById(event.getAuthorId()).orElseThrow();
        var organization = event.getOrganizationId() != null ? organizations.find(event.getOrganizationId()) : null;
        var participants = registrations.findUsers(eventId, RegistrationStatus.CONFIRMED);
        var myRegistration = registrations.findByEventIdAndUserId(eventId, userId).orElse(null);
        var now = dbTime.now();
        boolean canSeePrivateDetails = policy.canSeePrivateDetails(event, userId, myRegistration);
        var viewer = mapper.toViewer(
                myRegistration != null ? myRegistration.getStatus() : null,
                policy.registerBlockedReason(event, userId, myRegistration, participants.size(), now),
                policy.isOrganizer(event, userId),
                policy.canManage(event, userId),
                policy.canManageOrganizers(event, userId),
                policy.cancelBlockedReason(event, myRegistration, now) == null,
                canSeePrivateDetails,
                policy.commentBlockedReason(event) == null);
        return mapper.toResponse(event, sport, author, organization, organizerService.list(event), participants,
                participants.size(), files.eventPhotos(eventId), viewer,
                canSeePrivateDetails ? event.getOnlineUrl() : null,
                canSeePrivateDetails ? event.getPrivateDetails() : null,
                occurrenceService.schedule(event), occurrenceService.next(event, now),
                occurrenceService.single(event, userId, now));
    }

    /**
     * Публикуется сразу. Админ не создаёт (403); аккаунт организации — только после одобрения (403),
     * и событие привязывается к его организации. Свой вид спорта создаётся в этой же транзакции.
     * Серия: расписание разворачивается в занятия; в нём должно быть хоть одно будущее занятие.
     */
    @Transactional
    public EventResponse create(UUID userId, EventRequest request) {
        var user = users.findById(userId).filter(AppUser::isActive)
                .orElseThrow(() -> new UnauthorizedException("Сессия недействительна, войдите заново"));
        var organization = user.getSystemRole() == SystemRole.ORG ? organizations.forAccount(userId) : null;
        var blocked = policy.createBlockedReason(user, organization);
        if (blocked != null) {
            throw new ForbiddenException(blocked);
        }
        var now = dbTime.now();
        validate(request, now);
        var plan = request.schedule() != null ? expander.expand(request.schedule()) : null;
        var firstSlot = plan != null ? plan.after(now).stream().findFirst()
                .orElseThrow(() -> new BadRequestException("В расписании нет ни одного будущего занятия")) : null;
        var sport = sportService.resolve(request.sportId(), request.sportName(), userId);
        var organizationId = organization != null ? organization.getId() : null;
        var saved = events.saveAndFlush(mapper.toEntity(request, userId, sport.getId(), organizationId,
                firstSlot != null ? firstSlot.start() : request.startAt(),
                firstSlot != null ? firstSlot.end() : request.endAt()));
        occurrenceService.apply(saved, plan, now);
        return get(saved.getId(), userId);
    }

    /**
     * Редактирует только организатор; удалённое — нельзя; лимит мест не меньше уже подтверждённых
     * (у серии — не меньше отметок на любом будущем занятии). Разовое нельзя сделать серией и наоборот.
     * У серии занятия пересчитываются по новым правилам (прошедшие не трогаются).
     */
    @Transactional
    public EventResponse update(UUID eventId, UUID userId, EventRequest request) {
        var event = events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
        if (!policy.isOrganizer(event, userId)) {
            throw new ForbiddenException("Редактировать мероприятие может только организатор");
        }
        if (!policy.canManage(event, userId)) {
            throw new ConflictException("Мероприятие удалено, редактировать нельзя");
        }
        var now = dbTime.now();
        validate(request, now);
        if ((request.schedule() != null) != event.isRecurring()) {
            throw new ConflictException(event.isRecurring()
                    ? "Повторяющееся мероприятие нельзя сделать разовым: создайте новое"
                    : "Разовое мероприятие нельзя сделать повторяющимся: создайте новое");
        }
        var plan = request.schedule() != null ? expander.expand(request.schedule()) : null;
        if (request.capacity() != null) {
            if (event.isRecurring()) {
                var attending = occurrenceService.maxFutureAttendance(eventId, now);
                if (request.capacity() < attending) {
                    throw new ConflictException("На одно из занятий уже отметились " + attending
                            + ", лимит мест не может быть меньше");
                }
            } else {
                var confirmedCount = registrations.countByEventIdAndStatus(eventId, RegistrationStatus.CONFIRMED);
                if (request.capacity() < confirmedCount) {
                    throw new ConflictException("Уже записано " + confirmedCount + ", лимит мест не может быть меньше");
                }
            }
        }
        var sport = sportService.resolve(request.sportId(), request.sportName(), userId);
        // у серии время мероприятия пересчитает OccurrenceService по первому занятию
        mapper.update(event, request, sport.getId(), plan != null ? event.getStartAt() : request.startAt(),
                plan != null ? event.getEndAt() : request.endAt());
        events.saveAndFlush(event);
        occurrenceService.apply(event, plan, now);
        return get(eventId, userId);
    }

    /**
     * Фото в галерею, в конец. Добавляет тот, кто может управлять мероприятием (EventAccessPolicy); не больше 6.
     * Строка мероприятия заблокирована: параллельные загрузки не превысят лимит.
     */
    @Transactional
    public EventResponse addPhoto(UUID eventId, UUID userId, FileUpload upload) {
        var event = requireManageable(eventId, userId);
        if (storedFiles.countByEventIdAndKind(eventId, FileKind.EVENT_PHOTO) >= MAX_PHOTOS) {
            throw new ConflictException("Можно загрузить не больше " + MAX_PHOTOS + " фото");
        }
        int position = storedFiles.maxPosition(eventId, FileKind.EVENT_PHOTO) + 1;
        files.store(FileKind.EVENT_PHOTO, upload, userId, null, event.getId(), position);
        return get(eventId, userId);
    }

    @Transactional
    public EventResponse removePhoto(UUID eventId, UUID fileId, UUID userId) {
        requireManageable(eventId, userId);
        var photo = storedFiles.findById(fileId)
                .filter(f -> f.getKind() == FileKind.EVENT_PHOTO && eventId.equals(f.getEventId()))
                .orElseThrow(() -> new NoSuchElementException(FileService.NOT_FOUND));
        files.delete(photo);
        return get(eventId, userId);
    }

    private Event requireManageable(UUID eventId, UUID userId) {
        var event = events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
        if (!policy.isOrganizer(event, userId)) {
            throw new ForbiddenException("Менять фото может только организатор");
        }
        if (!policy.canManage(event, userId)) {
            throw new ConflictException("Мероприятие удалено, менять фото нельзя");
        }
        return event;
    }

    /**
     * Список для «моих» и профиля: у серии показывается ближайшее будущее занятие.
     */
    @Transactional(readOnly = true)
    public List<EventSummaryResponse> summaries(List<Event> eventList, UUID userId) {
        return summaries(eventList, userId, dbTime.now(), null);
    }

    /**
     * Список для ленты и «моих»: счётчики и мои статусы — по одному запросу на весь список.
     * У серии время карточки — ближайшее занятие в [from, to] (to = null — без границы).
     */
    @Transactional(readOnly = true)
    public List<EventSummaryResponse> summaries(List<Event> eventList, UUID userId, Instant from, Instant to) {
        if (eventList.isEmpty()) {
            return List.of();
        }
        var lookups = listLookups.load(eventList, userId, from, to != null ? to : OccurrenceService.FAR_FUTURE);
        var coverByEventId = files.eventCovers(eventList.stream().map(Event::getId).toList());
        return eventList.stream()
                .map(event -> mapper.toSummary(event, lookups.sport(event), lookups.confirmed(event),
                        lookups.myStatus(event), coverByEventId.get(event.getId()), lookups.next(event),
                        lookups.occurrenceAttendees(event), lookups.scheduleDescription(event),
                        lookups.quorumStatus(event), lookups.cancelledSingle(event)))
                .toList();
    }

    /** Разовому нужно будущее начало; у серии время задаёт только расписание. Кворум не больше лимита мест. */
    private static void validate(EventRequest request, Instant now) {
        if (request.minParticipants() != null && request.capacity() != null
                && request.minParticipants() > request.capacity()) {
            throw new BadRequestException("Кворум не может быть больше лимита мест");
        }
        if (request.schedule() == null) {
            if (request.startAt() == null) {
                throw new BadRequestException("Укажите время начала");
            }
            if (!request.startAt().isAfter(now)) {
                throw new BadRequestException("Начало должно быть в будущем");
            }
            if (request.endAt() != null && !request.endAt().isAfter(request.startAt())) {
                throw new BadRequestException("Окончание должно быть позже начала");
            }
        } else if (request.startAt() != null || request.endAt() != null) {
            throw new BadRequestException("У повторяющегося мероприятия время задаётся расписанием: "
                    + "не передавайте startAt и endAt");
        }
        if (request.format() == EventFormat.OFFLINE && Strings.blankToNull(request.address()) == null) {
            throw new BadRequestException("Для очного мероприятия нужен адрес");
        }
        if (request.format() == EventFormat.ONLINE && Strings.blankToNull(request.onlineUrl()) == null) {
            throw new BadRequestException("Для онлайн-мероприятия нужна ссылка на встречу");
        }
        if ((request.lat() == null) != (request.lon() == null)) {
            throw new BadRequestException("Укажите и широту, и долготу");
        }
        if (request.format() == EventFormat.OFFLINE && request.lat() == null) {
            throw new BadRequestException("Отметьте место на карте");
        }
    }
}
