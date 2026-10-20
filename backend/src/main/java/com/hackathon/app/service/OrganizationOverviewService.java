package com.hackathon.app.service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.OrganizationCardResponse;
import com.hackathon.app.domain.dto.OrganizationMeetingResponse;
import com.hackathon.app.domain.dto.OrganizationOverviewResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.OccurrenceAttendance;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.OrganizationAward;
import com.hackathon.app.domain.entity.OrganizationSport;
import com.hackathon.app.domain.entity.OrganizationSubscription;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.entity.StoredFile;
import com.hackathon.app.domain.enums.AwardStatus;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.OrganizationAwardKind;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.mapper.FileMapper;
import com.hackathon.app.domain.mapper.OrganizationMapper;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventOrganizerRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.OccurrenceAttendanceRepository;
import com.hackathon.app.repository.OrganizationAwardRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.OrganizationSportRepository;
import com.hackathon.app.repository.OrganizationSubscriptionRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Публичная сводка. Все выборки переносимы на H2; участники и файлы загружаются пакетами. */
@Service
@RequiredArgsConstructor
public class OrganizationOverviewService {
    private final OrganizationRepository organizations;
    private final OrganizationMapper organizationMapper;
    private final OrganizationSportRepository organizationSports;
    private final OrganizationSubscriptionRepository subscriptionRepository;
    private final OrganizationSubscriptionService subscriptions;
    private final EventOccurrenceRepository occurrences;
    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final OccurrenceAttendanceRepository attendances;
    private final EventOrganizerRepository organizers;
    private final StoredFileRepository files;
    private final AppUserRepository users;
    private final SportRepository sports;
    private final OrganizationAwardRepository awards;
    private final UserMapper userMapper;
    private final FileMapper fileMapper;
    private final SportMapper sportMapper;
    private final DbTimeRepository time;
    private final MeetingAttendance meetingAttendance;

    @Transactional(readOnly = true)
    public OrganizationOverviewResponse overview(UUID id, UUID userId) {
        var org = requirePublic(id);
        var now = time.now();
        var snapshot = snapshot(id, now);
        var past = snapshot.past();
        var year = now.minus(365, ChronoUnit.DAYS);
        var visits = new HashMap<UUID, Integer>();
        var yearPeople = new HashSet<UUID>();
        past.forEach(o -> snapshot.people(o).forEach(u -> {
            visits.merge(u, 1, Integer::sum);
            if (!o.getStartAt().isBefore(year)) yearPeople.add(u);
        }));
        var month = YearMonth.from(now.atZone(MeetingAttendance.ZONE));
        var earnedMonths = awards.findByOrganizationIdAndStatusOrderByPeriodDesc(id, AwardStatus.CONFIRMED).stream()
                .filter(a -> a.getKind() == OrganizationAwardKind.ORG_OF_MONTH).map(OrganizationAward::getPeriod).collect(Collectors.toSet());
        var months = new ArrayList<OrganizationOverviewResponse.MonthCount>();
        for (int i = 11; i >= 0; i--) {
            var m = month.minusMonths(i);
            months.add(new OrganizationOverviewResponse.MonthCount(m.atDay(1), past.stream()
                    .filter(o -> YearMonth.from(o.getStartAt().atZone(zone(snapshot.event(o)))).equals(m)).count(),
                    earnedMonths.contains(m.atDay(1)), i == 0));
        }
        var schedule = new EnumMap<DayOfWeek, OrganizationOverviewResponse.ScheduleDay>(DayOfWeek.class);
        snapshot.upcoming().stream().filter(o -> o.getStartAt().isBefore(now.plus(28, ChronoUnit.DAYS))).forEach(o -> {
            var e = snapshot.event(o);
            var day = o.getStartAt().atZone(zone(e)).getDayOfWeek();
            schedule.putIfAbsent(day, new OrganizationOverviewResponse.ScheduleDay(day, e.getId(), o.getStartAt(),
                    zone(e).getId(), e.getTitle(), place(e)));
        });
        var leaderEvents = new HashMap<UUID, Set<UUID>>();
        snapshot.events().values().forEach(e -> leaderEvents.computeIfAbsent(e.getAuthorId(), _ -> new HashSet<>()).add(e.getId()));
        if (!snapshot.events().isEmpty()) organizers.findByEventIdIn(snapshot.events().keySet()).forEach(o ->
                leaderEvents.computeIfAbsent(o.getUserId(), _ -> new HashSet<>()).add(o.getEventId()));
        leaderEvents.remove(org.getAccountId());
        var leaderUsers = users.findAllById(leaderEvents.keySet()).stream().collect(Collectors.toMap(AppUser::getId, userMapper::toShort));
        var leaders = leaderEvents.entrySet().stream().filter(e -> leaderUsers.containsKey(e.getKey()))
                .map(e -> new OrganizationOverviewResponse.Leader(leaderUsers.get(e.getKey()), snapshot.all().stream()
                        .filter(o -> e.getValue().contains(o.getEventId())).count()))
                .sorted(Comparator.comparingLong(OrganizationOverviewResponse.Leader::meetingsCount).reversed()
                        .thenComparing(l -> l.user().id())).toList();
        var placeCounts = snapshot.all().stream().collect(Collectors.groupingBy(o -> place(snapshot.event(o)), Collectors.counting()));
        var places = placeCounts.entrySet().stream().map(e -> new OrganizationOverviewResponse.Place(e.getKey(), e.getValue()))
                .sorted(Comparator.comparingLong(OrganizationOverviewResponse.Place::meetingsCount).reversed().thenComparing(OrganizationOverviewResponse.Place::name))
                .limit(4).toList();
        var sportCounts = past.stream().collect(Collectors.groupingBy(o -> snapshot.event(o).getSportId(), Collectors.counting()));
        var pastSports = sportCounts.entrySet().stream().map(e -> new OrganizationOverviewResponse.SportCount(snapshot.sports().get(e.getKey()), e.getValue()))
                .sorted(Comparator.comparingLong(OrganizationOverviewResponse.SportCount::count).reversed().thenComparing(s -> s.sport().name())).toList();
        var photoCounts = files.organizationPhotoCounts(id);
        var firstYear = snapshot.all().stream().map(o -> o.getStartAt().atZone(zone(snapshot.event(o))).getYear()).min(Integer::compareTo).orElse(null);
        return new OrganizationOverviewResponse(firstYear, past.size(), yearPeople.size(),
                photoCounts.stream().mapToLong(StoredFileRepository.PhotoCount::getCount).sum(), photoCounts.size(),
                visits.size() < 5 ? null : (int) Math.round(100.0 * visits.values().stream().filter(v -> v >= 2).count() / visits.size()),
                users.findById(userId).map(AppUser::getPetName).orElse("Бублик"), subscriptions.state(id, userId), months,
                List.copyOf(schedule.values()), leaders, places, pastSports,
                meetingsPage(snapshot, snapshot.upcoming(), userId, 0, 3), meetingsPage(snapshot, past, userId, 0, 4), photos(id, 0, 6));
    }

    @Transactional(readOnly = true)
    public PageResponse<OrganizationMeetingResponse> past(UUID id, UUID userId, UUID sportId, int page, int size) {
        validatePagination(page, size);
        requirePublic(id);
        var snapshot = snapshot(id, time.now());
        var filtered = snapshot.past().stream().filter(o -> sportId == null || snapshot.event(o).getSportId().equals(sportId)).toList();
        return meetingsPage(snapshot, filtered, userId, page, size);
    }

    @Transactional(readOnly = true)
    public PageResponse<FileResponse> photos(UUID id, int page, int size) {
        requirePublic(id);
        validatePagination(page, size);
        return PageResponse.of(files.organizationPhotos(id, PageRequest.of(page, size)), fileMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public List<String> cities() { return organizations.publicCities(); }

    @Transactional(readOnly = true)
    public PageResponse<OrganizationCardResponse> catalog(UUID userId, String searchText, String city, UUID sportId, boolean mine, int page, int size) {
        validatePagination(page, size);
        var now = time.now();
        var result = organizations.catalog("%" + Optional.ofNullable(searchText).orElse("").strip().toLowerCase(Locale.ROOT) + "%",
                city == null ? "" : city.strip().toLowerCase(Locale.ROOT), sportId, mine, userId, now,
                PageRequest.of(page, size, Sort.by("name", "id")));
        if (result.isEmpty()) return PageResponse.of(result, _ -> null);
        var ids = result.stream().map(Organization::getId).toList();
        var subscriberCounts = subscriptionRepository.counts(ids).stream().collect(Collectors.toMap(
                OrganizationSubscriptionRepository.OrganizationCount::getOrganizationId, OrganizationSubscriptionRepository.OrganizationCount::getCount));
        var subscribed = subscriptionRepository.findByUserIdAndOrganizationIdIn(userId, ids).stream()
                .map(OrganizationSubscription::getOrganizationId).collect(Collectors.toSet());
        var attended = new HashSet<>(occurrences.attendedOrganizations(ids, userId, now));
        var started = occurrences.findStartedOrganizations(ids, now).stream()
                .filter(o -> !meetingAttendance.endOf(o).isAfter(now)).toList();
        var startedEvents = events.findAllById(started.stream().map(EventOccurrence::getEventId).distinct().toList()).stream()
                .collect(Collectors.toMap(Event::getId, Function.identity()));
        var hosted = started.stream().collect(Collectors.groupingBy(o -> startedEvents.get(o.getEventId()).getOrganizationId(), Collectors.counting()));
        var interests = organizationSports.findByOrganizationIdIn(ids);
        var sportById = sports.findAllById(interests.stream().map(OrganizationSport::getSportId).distinct().toList()).stream()
                .collect(Collectors.toMap(Sport::getId, sportMapper::toResponse));
        var orgSports = interests.stream().sorted(Comparator.comparing(OrganizationSport::getCreatedAt).thenComparing(OrganizationSport::getId))
                .collect(Collectors.groupingBy(OrganizationSport::getOrganizationId, Collectors.mapping(i -> sportById.get(i.getSportId()), Collectors.toList())));
        var awardMonths = awards.findByOrganizationIdInAndStatus(ids, AwardStatus.CONFIRMED).stream()
                .filter(a -> a.getKind() == OrganizationAwardKind.ORG_OF_MONTH)
                .collect(Collectors.toMap(OrganizationAward::getOrganizationId, OrganizationAward::getPeriod, (a, b) -> a.isAfter(b) ? a : b));
        return PageResponse.of(result, org -> organizationMapper.toCard(org, orgSports.getOrDefault(org.getId(), List.of()),
                hosted.getOrDefault(org.getId(), 0L), subscriberCounts.getOrDefault(org.getId(), 0L),
                subscribed.contains(org.getId()), attended.contains(org.getId()), awardMonths.get(org.getId())));
    }

    private static void validatePagination(int page, int size) {
        if (page < 0) throw new BadRequestException("Номер страницы не может быть отрицательным");
        if (size < 1 || size > 100) throw new BadRequestException("Размер страницы должен быть от 1 до 100");
    }

    private Organization requirePublic(UUID id) {
        return organizations.findByIdAndStatus(id, OrganizationStatus.APPROVED)
                .orElseThrow(() -> new NoSuchElementException(OrganizationService.NOT_FOUND));
    }

    private record Snapshot(List<EventOccurrence> all, List<EventOccurrence> past, List<EventOccurrence> upcoming,
            Map<UUID, Event> events, Map<UUID, SportResponse> sports, Map<UUID, List<UUID>> registered,
            Map<UUID, List<UUID>> attending) {
        Event event(EventOccurrence o) { return events.get(o.getEventId()); }
        List<UUID> people(EventOccurrence o) {
            return (event(o).isRecurring() ? attending.getOrDefault(o.getId(), List.of()) : registered.getOrDefault(o.getEventId(), List.of()))
                    .stream().filter(id -> !id.equals(event(o).getAuthorId())).distinct().toList();
        }
    }

    private Snapshot snapshot(UUID id, Instant now) {
        var all = occurrences.findPublicOrganization(id);
        var byId = events.findAllById(all.stream().map(EventOccurrence::getEventId).distinct().toList()).stream().collect(Collectors.toMap(Event::getId, Function.identity()));
        var sportById = sports.findAllById(byId.values().stream().map(Event::getSportId).distinct().toList()).stream().collect(Collectors.toMap(Sport::getId, sportMapper::toResponse));
        Map<UUID, List<UUID>> registered = byId.isEmpty() ? Map.of() : registrations.findByEventIdInAndStatus(byId.keySet(), RegistrationStatus.CONFIRMED).stream()
                .collect(Collectors.groupingBy(Registration::getEventId, Collectors.mapping(Registration::getUserId, Collectors.toList())));
        Map<UUID, List<UUID>> attending = all.isEmpty() ? Map.of() : attendances.findByOccurrenceIdIn(all.stream().map(EventOccurrence::getId).toList()).stream()
                .collect(Collectors.groupingBy(OccurrenceAttendance::getOccurrenceId, Collectors.mapping(OccurrenceAttendance::getUserId, Collectors.toList())));
        var past = all.stream().filter(o -> !meetingAttendance.endOf(o).isAfter(now)).sorted(Comparator.comparing(EventOccurrence::getStartAt).reversed().thenComparing(EventOccurrence::getId)).toList();
        var upcoming = all.stream().filter(o -> o.getStartAt().isAfter(now)).toList();
        return new Snapshot(all, past, upcoming, byId, sportById, registered, attending);
    }

    private PageResponse<OrganizationMeetingResponse> meetingsPage(Snapshot snapshot, List<EventOccurrence> source, UUID userId, int page, int size) {
        var selected = source.stream().skip((long) page * size).limit(size).toList();
        var eventIds = selected.stream().map(EventOccurrence::getEventId).distinct().toList();
        var personIds = selected.stream().flatMap(o -> snapshot.people(o).stream().limit(4)).collect(Collectors.toSet());
        var personById = users.findAllById(personIds).stream().collect(Collectors.toMap(AppUser::getId, userMapper::toShort));
        var myRegistrations = eventIds.isEmpty() ? Map.<UUID, RegistrationStatus>of() : registrations.findByUserIdAndEventIdIn(userId, eventIds).stream()
                .collect(Collectors.toMap(Registration::getEventId, Registration::getStatus));
        var covers = new HashMap<UUID, StoredFile>();
        if (!eventIds.isEmpty()) files.findByEventIdInAndKindOrderByPositionAscCreatedAtAsc(eventIds, FileKind.EVENT_PHOTO).forEach(f -> covers.putIfAbsent(f.getEventId(), f));
        var counts = eventIds.isEmpty() ? Map.<UUID, Long>of() : files.photoCounts(eventIds).stream().collect(Collectors.toMap(StoredFileRepository.PhotoCount::getEventId, StoredFileRepository.PhotoCount::getCount));
        var items = selected.stream().map(o -> {
            var e = snapshot.event(o);
            var cover = covers.get(e.getId());
            return organizationMapper.toMeeting(e, o, snapshot.sports().get(e.getSportId()),
                    zone(e).getId(), place(e), snapshot.people(o).size(), snapshot.people(o).stream().limit(4).map(personById::get).filter(Objects::nonNull).toList(),
                    myRegistrations.get(e.getId()), cover == null ? null : fileMapper.fileUrl(cover.getId()), cover == null ? null : fileMapper.focus(cover), counts.getOrDefault(e.getId(), 0L));
        }).toList();
        return PageResponse.slice(items, page, size, source.size());
    }

    private static ZoneId zone(Event event) { return event.getTimeZone() == null ? MeetingAttendance.ZONE : ZoneId.of(event.getTimeZone()); }
    private static String place(Event event) { return event.getFormat() == EventFormat.ONLINE ? "Онлайн" : Objects.requireNonNullElse(event.getAddress(), "Место уточняется"); }
}
