package com.hackathon.app.service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hackathon.app.config.DemoProperties;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.domain.entity.Comment;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOrganizer;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.PetSlotKind;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.mapper.CommentMapper;
import com.hackathon.app.domain.mapper.EventMapper;
import com.hackathon.app.domain.mapper.OrganizerMapper;
import com.hackathon.app.domain.mapper.RegistrationMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.CommentRepository;
import com.hackathon.app.repository.DemoDataRepository;
import com.hackathon.app.repository.EventOrganizerRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.service.DemoBulkData.City;
import com.hackathon.app.service.DemoBulkData.Club;
import com.hackathon.app.service.DemoBulkData.Qa;
import com.hackathon.app.service.DemoBulkData.Template;
import com.hackathon.app.service.DemoBulkData.Venue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Массовые демо-данные (часть DemoSeeder, только при DEMO_MODE=true): сотни пользователей в 12 городах с датами
 * регистрации за полгода, клубы во всех статусах допуска, мероприятия на реальных площадках (прошедшие и будущие,
 * часть снята админом), записи и заявки во всех статусах, соорганизаторы, обсуждения, образы бобров.
 * Генерация детерминированная (фиксированный seed), даты — от сегодняшнего дня, поэтому демо не устаревает.
 * Идемпотентно целиком: если клуб-маркер уже есть, повторно ничего не создаётся. Полный сброс: docker compose down -v.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DemoBulkSeeder {

    private static final long SEED = 20261019L;
    private static final int PEOPLE = 240;
    /** Регистрации раскиданы на полгода, чаще — ближе к сегодняшнему дню (проект растёт). */
    private static final int SIGNUP_DAYS = 180;
    /** «10 октября присоединилось 18»: всплеск после поста в соцсетях, N дней назад. */
    private static final int SPIKE_DAYS_AGO = 9;
    private static final int SPIKE_PEOPLE = 18;
    /** Мероприятия частных лиц на единицу веса города. */
    private static final int EVENTS_PER_CITY_WEIGHT = 2;
    private static final int ONLINE_EVENTS = 16;
    private static final List<String> LOCATION_NOTES = List.of("У главного входа", "Встречаемся у информационного стенда",
            "Ищите людей в ярких футболках", "У парковки", "Возле кафе, у скамеек");

    private final DemoProperties props;
    private final AppUserRepository users;
    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final EventOrganizerRepository organizers;
    private final CommentRepository comments;
    private final DemoDataRepository demoData;
    private final SportService sportService;
    private final OccurrenceService occurrenceService;
    private final OrganizationService organizationService;
    private final AdminOrganizationService adminOrganizationService;
    private final PetService pets;
    private final PetCatalogService petCatalog;
    private final UserMapper userMapper;
    private final EventMapper eventMapper;
    private final RegistrationMapper registrationMapper;
    private final CommentMapper commentMapper;
    private final OrganizerMapper organizerMapper;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    /** Человек или аккаунт клуба: где живёт и когда присоединился. */
    private record Person(UUID id, City city, Instant signedUpAt) {
    }

    /** Одобренный клуб и его аккаунт — автор событий клуба. */
    private record ApprovedClub(Person account, UUID organizationId, Club club, Instant approvedAt) {
    }

    /** Состояние одного прогона: генератор случайных чисел, «сейчас», счётчики для лога. */
    private final class Run {
        final Random random = new Random(SEED);
        final Instant now = clock.instant();
        final Map<String, Sport> sports = new HashMap<>();
        int events;
        int registrations;
        int comments;

        boolean chance(double p) {
            return random.nextDouble() < p;
        }

        int between(int min, int max) {
            return min + random.nextInt(max - min + 1);
        }

        <T> T pick(List<T> list) {
            return list.get(random.nextInt(list.size()));
        }

        /** Момент между from и to (если окно пустое — from). */
        Instant between(Instant from, Instant to) {
            long span = Duration.between(from, to).toSeconds();
            return span <= 0 ? from : from.plusSeconds((long) (random.nextDouble() * span));
        }

        City city() {
            int total = DemoBulkData.CITIES.stream().mapToInt(City::weight).sum();
            int roll = random.nextInt(total);
            for (var city : DemoBulkData.CITIES) {
                roll -= city.weight();
                if (roll < 0) {
                    return city;
                }
            }
            return DemoBulkData.CITIES.getFirst();
        }
    }

    @Transactional
    public void seed(Map<String, UUID> coreIds) {
        var marker = DemoBulkData.CLUBS.getFirst().username();
        if (users.existsByUsernameIgnoreCase(marker)) {
            return;
        }
        long started = System.currentTimeMillis();
        var run = new Run();
        var adminId = coreIds.get("admin");
        var passwordHash = passwordEncoder.encode(props.password()); // один хеш на всех: bcrypt на сотни аккаунтов долгий
        var people = createPeople(run, passwordHash);
        var clubs = createClubs(run, passwordHash, adminId);
        var peopleByCity = people.stream().collect(Collectors.groupingBy(p -> p.city().name()));

        for (var city : DemoBulkData.CITIES) {
            var locals = peopleByCity.getOrDefault(city.name(), List.of());
            for (int i = 0; i < city.weight() * EVENTS_PER_CITY_WEIGHT && !locals.isEmpty(); i++) {
                var template = run.pick(DemoBulkData.TEMPLATES.stream().filter(t -> !t.online()).toList());
                createEvent(run, run.pick(locals), null, city, template, people, peopleByCity, adminId);
            }
        }
        for (var club : clubs) {
            var templates = DemoBulkData.TEMPLATES.stream()
                    .filter(t -> !t.online() && t.sport().equals(club.club().sport())).toList();
            int count = run.between(3, 6);
            for (int i = 0; i < count && !templates.isEmpty(); i++) {
                createEvent(run, club.account(), club.organizationId(), club.account().city(), run.pick(templates),
                        people, peopleByCity, adminId);
            }
        }
        var onlineTemplates = DemoBulkData.TEMPLATES.stream().filter(Template::online).toList();
        for (int i = 0; i < ONLINE_EVENTS; i++) {
            var author = run.pick(people);
            createEvent(run, author, null, author.city(), run.pick(onlineTemplates), people, peopleByCity, adminId);
        }
        dressPets(run, people);
        log.info("Demo bulk data: {} people, {} clubs, {} events, {} registrations, {} comments in {} ms",
                people.size(), DemoBulkData.CLUBS.size(), run.events, run.registrations, run.comments,
                System.currentTimeMillis() - started);
    }

    // --- Пользователи и клубы ---

    private List<Person> createPeople(Run run, String passwordHash) {
        var taken = new HashSet<String>();
        var people = new ArrayList<Person>();
        for (int i = 0; i < PEOPLE + SPIKE_PEOPLE; i++) {
            var city = run.city();
            boolean female = run.chance(0.48);
            var first = run.pick(female ? DemoBulkData.FEMALE_NAMES : DemoBulkData.MALE_NAMES);
            var lastMale = run.pick(DemoBulkData.LAST_NAMES);
            var last = female ? femaleLastName(lastMale) : lastMale;
            var username = uniqueUsername(run, translit(first) + "." + translit(last), taken);
            int daysAgo = i >= PEOPLE ? SPIKE_DAYS_AGO
                    : (int) Math.floor(SIGNUP_DAYS * (1 - Math.sqrt(run.random.nextDouble()))) + 1;
            var signedUpAt = LocalDate.ofInstant(run.now, city.zone()).minusDays(daysAgo)
                    .atTime(run.between(7, 23), run.between(0, 59)).atZone(city.zone()).toInstant();
            var user = users.save(userMapper.toLocalUser(UUID.randomUUID(), username, username + "@demo.local",
                    passwordHash, first, last, city.name(), run.pick(DemoBulkData.BIOS), SystemRole.USER, signedUpAt));
            people.add(new Person(user.getId(), city, signedUpAt));
        }
        demoData.flushAndClear();
        return people;
    }

    /** Клубы через обычные сервисы (анкета → решение админа), потом даты сдвигаются в прошлое. */
    private List<ApprovedClub> createClubs(Run run, String passwordHash, UUID adminId) {
        var approved = new ArrayList<ApprovedClub>();
        for (var club : DemoBulkData.CLUBS) {
            var city = DemoBulkData.CITIES.stream().filter(c -> c.name().equals(club.city())).findFirst().orElseThrow();
            int daysAgo = switch (club.status()) {
                case APPROVED -> run.between(90, 175);
                case REJECTED -> run.between(15, 60);
                case PENDING -> run.between(1, 6);
            };
            var signedUpAt = run.now.minus(Duration.ofDays(daysAgo)).minus(Duration.ofHours(run.between(1, 10)));
            var account = users.save(userMapper.toLocalUser(UUID.randomUUID(), club.username(),
                    club.username() + "@demo.local", passwordHash, club.contactFirstName(), club.contactLastName(),
                    city.name(), null, SystemRole.ORG, signedUpAt));
            var organizationId = organizationService.saveMine(account.getId(),
                    new SaveOrganizationRequest(club.name(), club.description(), city.name(), club.contacts())).id();
            var submittedAt = signedUpAt.plus(Duration.ofHours(run.between(1, 20)));
            var reviewedAt = club.status() == OrganizationStatus.PENDING ? null
                    : submittedAt.plus(Duration.ofHours(run.between(3, 50)));
            switch (club.status()) {
                case APPROVED -> adminOrganizationService.approve(organizationId, adminId);
                case REJECTED -> adminOrganizationService.reject(organizationId, adminId, club.rejectReason());
                case PENDING -> {
                }
            }
            demoData.backdateOrganization(organizationId, submittedAt, reviewedAt);
            if (club.status() == OrganizationStatus.APPROVED) {
                // события клуб публикует только после одобрения: для них «присоединился» = одобрен
                approved.add(new ApprovedClub(new Person(account.getId(), city, reviewedAt), organizationId, club, reviewedAt));
            }
        }
        demoData.flushAndClear();
        return approved;
    }

    // --- Мероприятия ---

    private void createEvent(Run run, Person author, UUID organizationId, City city, Template template,
            List<Person> people, Map<String, List<Person>> peopleByCity, UUID adminId) {
        var zone = city.zone();
        var today = LocalDate.ofInstant(run.now, zone);
        // 45% прошедших (история записей и обсуждений), остальные — в ближайшие полтора месяца
        int dayOffset = run.chance(0.45) ? -run.between(1, 60) : run.between(1, 45);
        var startAt = today.plusDays(dayOffset).atTime(run.pick(template.hours()), run.chance(0.7) ? 0 : 30)
                .atZone(zone).toInstant();
        var earliestCreated = author.signedUpAt().plus(Duration.ofHours(2));
        if (!startAt.minus(Duration.ofDays(1)).isAfter(earliestCreated)) {
            // автор присоединился позже — переносим в будущее
            startAt = today.plusDays(run.between(2, 30)).atTime(run.pick(template.hours()), 0).atZone(zone).toInstant();
        }
        var latestCreated = run.now.minus(Duration.ofHours(1));
        var createdAt = startAt.minus(Duration.ofDays(run.between(2, 21))).minus(Duration.ofHours(run.between(0, 12)));
        if (createdAt.isAfter(latestCreated)) {
            // событие далеко впереди: опубликовано когда-то за последние три недели, а не «прямо сейчас» всем скопом
            createdAt = run.between(max(earliestCreated, run.now.minus(Duration.ofDays(21))), latestCreated);
        }
        createdAt = clamp(createdAt, earliestCreated, latestCreated);
        var endAt = startAt.plus(Duration.ofMinutes(template.durationMinutes()));

        Venue venue = null;
        if (!template.online()) {
            var venues = city.venues().stream()
                    .filter(v -> template.indoor() == null || v.indoor() == template.indoor()).toList();
            venue = run.pick(venues.isEmpty() ? city.venues() : venues);
        }
        Integer capacity = template.maxCapacity() > 0 ? run.between(template.minCapacity(), template.maxCapacity()) : null;
        var joinMode = run.chance(template.requestShare()) ? JoinMode.REQUEST : JoinMode.FREE;
        var request = new EventRequest(run.pick(template.titles()), template.description(), null, null, startAt, endAt,
                template.online() ? EventFormat.ONLINE : EventFormat.OFFLINE,
                venue == null ? null : venue.address(),
                venue == null ? null : venue.name() + (run.chance(0.5) ? ". " + run.pick(LOCATION_NOTES) : ""),
                template.online() ? "https://meet.example.com/" + Long.toString(run.random.nextLong() & 0xFFFFFFFFL, 36) : null,
                venue == null ? null : venue.lat() + (run.random.nextDouble() - 0.5) * 0.004,
                venue == null ? null : venue.lon() + (run.random.nextDouble() - 0.5) * 0.004,
                run.pick(template.levels()), template.kind(), template.requirements(), template.equipment(), capacity,
                joinMode, "Чат участников: https://t.me/+" + Long.toString(run.random.nextLong() & 0xFFFFFFFFFFL, 36),
                null, null);
        var sport = run.sports.computeIfAbsent(template.sport(), name -> sportService.resolve(null, name, author.id()));
        var event = events.saveAndFlush(eventMapper.toEntity(request, author.id(), sport.getId(), organizationId,
                startAt, endAt));
        // занятие разового мероприятия: по нему лента и карта фильтруют по датам
        occurrenceService.apply(event, null, run.now);

        // соорганизатор у части событий частных лиц
        UUID coOrganizerId = null;
        var locals = peopleByCity.getOrDefault(city.name(), people);
        if (organizationId == null && run.chance(0.12)) {
            var candidate = run.pick(locals);
            if (!candidate.id().equals(author.id()) && candidate.signedUpAt().isBefore(createdAt)) {
                coOrganizerId = candidate.id();
                var organizer = organizers.save(organizerMapper.toEntity(event.getId(), coOrganizerId, author.id()));
                organizers.flush();
                demoData.backdate(EventOrganizer.class, organizer.getId(), createdAt.plus(Duration.ofHours(1)));
            }
        }

        var participants = createRegistrations(run, event, author.id(), coOrganizerId, createdAt, startAt, locals, people);
        createComments(run, event, author.id(), coOrganizerId, createdAt, startAt, endAt, participants, locals);

        // модерация: немного снятых и удалённых, с причиной
        double roll = run.random.nextDouble();
        if (roll < 0.06) {
            var status = roll < 0.04 ? EventStatus.UNPUBLISHED : EventStatus.DELETED;
            var reason = run.pick(status == EventStatus.UNPUBLISHED ? DemoBulkData.UNPUBLISH_REASONS : DemoBulkData.DELETE_REASONS);
            var moderated = events.findById(event.getId()).orElseThrow();
            eventMapper.moderate(moderated, status, reason,
                    run.between(createdAt.plus(Duration.ofHours(6)), min(startAt, run.now)), adminId);
            events.save(moderated);
        }
        events.flush();
        demoData.backdate(Event.class, event.getId(), createdAt);
        demoData.flushAndClear();
        run.events++;
    }

    /** Записи и заявки во всех статусах; возвращает подтверждённых участников (для обсуждения). */
    private List<UUID> createRegistrations(Run run, Event event, UUID authorId, UUID coOrganizerId, Instant createdAt,
            Instant startAt, List<Person> locals, List<Person> people) {
        boolean past = startAt.isBefore(run.now);
        var windowEnd = min(startAt, run.now).minus(Duration.ofMinutes(15));
        boolean request = event.getJoinMode() == JoinMode.REQUEST;
        Integer capacity = event.getCapacity();
        int wanted = capacity != null
                ? (int) Math.round(capacity * (past ? 0.5 + run.random.nextDouble() * 0.5 : 0.2 + run.random.nextDouble() * 0.7))
                : past ? run.between(4, 22) : run.between(1, 15);
        if (request) {
            wanted += run.between(1, 4); // по заявке желающих больше, чем мест: кому-то откажут
        }
        var chosen = new LinkedHashMap<UUID, Person>();
        for (int attempt = 0; chosen.size() < wanted && attempt < wanted * 4; attempt++) {
            var person = run.chance(0.93) ? run.pick(locals) : run.pick(people);
            if (!person.id().equals(authorId) && !person.id().equals(coOrganizerId)
                    && person.signedUpAt().isBefore(windowEnd.minus(Duration.ofHours(1)))) {
                chosen.putIfAbsent(person.id(), person);
            }
        }
        var confirmed = new ArrayList<UUID>();
        for (var person : chosen.values()) {
            var registrationFrom = max(createdAt, person.signedUpAt()).plus(Duration.ofMinutes(20));
            if (!registrationFrom.isBefore(windowEnd)) {
                continue; // некогда было записаться
            }
            var registeredAt = run.between(registrationFrom, windowEnd);
            boolean seatsLeft = capacity == null || confirmed.size() < capacity;
            Registration registration;
            if (!request) {
                if (!seatsLeft) {
                    break;
                }
                registration = registrationMapper.toRegistration(event.getId(), person.id(), RegistrationStatus.CONFIRMED,
                        null, registeredAt);
                if (run.chance(0.08)) {
                    registrationMapper.cancel(registration, run.between(registeredAt, windowEnd), person.id());
                } else {
                    confirmed.add(person.id());
                }
            } else {
                var message = run.chance(0.6) ? run.pick(DemoBulkData.REQUEST_MESSAGES) : null;
                registration = registrationMapper.toRegistration(event.getId(), person.id(), RegistrationStatus.PENDING,
                        message, null);
                var decidedAt = registeredAt.plus(Duration.ofHours(run.between(1, 40)));
                if (past && !decidedAt.isBefore(windowEnd)) {
                    decidedAt = run.between(registeredAt, windowEnd); // к началу организатор успел решить все заявки
                }
                boolean decided = past || (decidedAt.isBefore(windowEnd) && run.chance(0.75));
                if (decided) {
                    if (seatsLeft && run.chance(0.78)) {
                        registrationMapper.decide(registration, RegistrationStatus.CONFIRMED, null, decidedAt, authorId);
                        confirmed.add(person.id());
                    } else {
                        registrationMapper.decide(registration, RegistrationStatus.REJECTED,
                                run.pick(DemoBulkData.REJECT_REASONS), decidedAt, authorId);
                    }
                }
            }
            var saved = registrations.save(registration);
            registrations.flush();
            demoData.backdate(Registration.class, saved.getId(), registeredAt);
            run.registrations++;
        }
        return confirmed;
    }

    /** Вопросы и ответы организатора до начала; после прошедших — отзывы. */
    private void createComments(Run run, Event event, UUID authorId, UUID coOrganizerId, Instant createdAt,
            Instant startAt, Instant endAt, List<UUID> participants, List<Person> locals) {
        if (!run.chance(0.5)) {
            return;
        }
        int threads = run.between(1, 3);
        var asked = new HashSet<Qa>();
        for (int i = 0; i < threads; i++) {
            var qa = run.pick(DemoBulkData.QUESTIONS);
            if (!asked.add(qa)) {
                continue;
            }
            var askerId = !participants.isEmpty() && run.chance(0.6) ? run.pick(participants) : run.pick(locals).id();
            if (askerId.equals(authorId)) {
                continue;
            }
            var askFrom = createdAt.plus(Duration.ofHours(1));
            var askTo = min(startAt, run.now).minus(Duration.ofHours(1));
            if (!askFrom.isBefore(askTo)) {
                continue; // событие опубликовано только что — вопросов ещё нет
            }
            var askedAt = run.between(askFrom, askTo);
            var questionId = comment(run, event, askerId, qa.question(), askedAt, null);
            var answeredAt = askedAt.plus(Duration.ofMinutes(run.between(10, 600)));
            if (run.chance(0.85) && answeredAt.isBefore(run.now)) {
                // организатор отвечает именно на вопрос — с цитатой, как в мессенджере
                var answerer = coOrganizerId != null && run.chance(0.3) ? coOrganizerId : authorId;
                var answerId = comment(run, event, answerer, qa.answer(), answeredAt, questionId);
                var thanksAt = answeredAt.plus(Duration.ofMinutes(run.between(5, 180)));
                if (run.chance(0.35) && thanksAt.isBefore(run.now)) {
                    comment(run, event, askerId, run.pick(DemoBulkData.THANKS), thanksAt, answerId);
                }
            }
            var echoAt = askedAt.plus(Duration.ofMinutes(run.between(5, 300)));
            if (!locals.isEmpty() && run.chance(0.2) && echoAt.isBefore(run.now)) {
                var echoerId = run.pick(locals).id();
                if (!echoerId.equals(askerId) && !echoerId.equals(authorId)) {
                    comment(run, event, echoerId, run.pick(DemoBulkData.ECHOES), echoAt, questionId);
                }
            }
        }
        if (endAt.plus(Duration.ofHours(1)).isBefore(run.now) && !participants.isEmpty() && run.chance(0.5)) {
            var qa = run.pick(DemoBulkData.AFTER_EVENT);
            var saidAt = run.between(endAt.plus(Duration.ofMinutes(30)), min(endAt.plus(Duration.ofDays(2)), run.now));
            var reviewId = comment(run, event, run.pick(participants), qa.question(), saidAt, null);
            var answeredAt = saidAt.plus(Duration.ofMinutes(run.between(15, 300)));
            if (answeredAt.isBefore(run.now)) {
                comment(run, event, authorId, qa.answer(), answeredAt, reviewId);
            }
        }
    }

    /** Сообщение (replyToId — ответ на него). Изредка автор его правит или удаляет — как в живом чате. */
    private UUID comment(Run run, Event event, UUID authorId, String text, Instant at, UUID replyToId) {
        var comment = commentMapper.toEntity(event.getId(), authorId, text, replyToId);
        var laterAt = at.plus(Duration.ofMinutes(run.between(1, 30)));
        if (laterAt.isBefore(run.now)) {
            double roll = run.random.nextDouble();
            if (roll < 0.06) {
                commentMapper.edit(comment, text + " " + run.pick(DemoBulkData.EDIT_TAILS), laterAt);
            } else if (roll < 0.3 && DemoBulkData.ECHOES.contains(text)) { // удаляют только реплики, на которые не отвечали
                commentMapper.delete(comment, laterAt);
            }
        }
        var saved = comments.save(comment);
        comments.flush();
        demoData.backdate(Comment.class, saved.getId(), at);
        run.comments++;
        return saved.getId();
    }

    // --- Бобры ---

    /** Образ у двух третей людей: болеют за местные клубы, остальное — по настроению. */
    private void dressPets(Run run, List<Person> people) {
        var catalog = petCatalog.load();
        Map<String, List<String>> codesBySlot = new HashMap<>();
        Map<String, PetSlotKind> kindBySlot = new HashMap<>();
        for (var slot : catalog.slots()) {
            kindBySlot.put(slot.getCode(), slot.getKind());
            codesBySlot.put(slot.getCode(), catalog.itemsBySlotId().getOrDefault(slot.getId(), List.of()).stream()
                    .map(i -> i.getCode()).toList());
        }
        var moods = List.of("idle", "happy", "happy", "happy", "thinking", "sad");
        for (var person : people) {
            if (!run.chance(0.66)) {
                continue;
            }
            var outfit = new HashMap<String, String>();
            var shirts = codesBySlot.getOrDefault("shirt", List.of());
            if (!shirts.isEmpty() && run.chance(0.85)) {
                var local = person.city().shirts().stream().filter(shirts::contains).toList();
                outfit.put("shirt", !local.isEmpty() && run.chance(0.6) ? run.pick(local) : run.pick(shirts));
            }
            codesBySlot.forEach((slot, codes) -> {
                if (kindBySlot.get(slot) == PetSlotKind.OUTFIT && !slot.equals("shirt") && !codes.isEmpty()
                        && run.chance(slot.equals("hat") ? 0.45 : 0.15)) {
                    outfit.put(slot, run.pick(codes));
                }
            });
            var activities = codesBySlot.getOrDefault(PetCatalogService.ACTIVITY, List.of(PetCatalogService.NO_ACTIVITY));
            var activity = run.chance(0.3) ? PetCatalogService.NO_ACTIVITY : run.pick(activities);
            pets.save(person.id(), new PetRequest(run.pick(moods), activity, outfit));
        }
        demoData.flushAndClear();
    }

    // --- Утилиты ---

    private static Instant clamp(Instant value, Instant from, Instant to) {
        return value.isBefore(from) ? from : value.isAfter(to) ? to : value;
    }

    private static Instant min(Instant a, Instant b) {
        return a.isBefore(b) ? a : b;
    }

    private static Instant max(Instant a, Instant b) {
        return a.isAfter(b) ? a : b;
    }

    private static String uniqueUsername(Run run, String base, Set<String> taken) {
        var username = base;
        while (!taken.add(username) || username.length() < 3) {
            username = base + run.between(1, 99);
        }
        return username;
    }

    /** Иванов → Иванова, Ильин → Ильина, Ким → Ким. */
    private static String femaleLastName(String male) {
        if (male.matches(".*(ов|ев|ёв|ин|ын)$")) {
            return male + "а";
        }
        if (male.endsWith("ский")) {
            return male.substring(0, male.length() - 4) + "ская";
        }
        return male;
    }

    private static final Map<Character, String> TRANSLIT = Map.ofEntries(
            Map.entry('а', "a"), Map.entry('б', "b"), Map.entry('в', "v"), Map.entry('г', "g"), Map.entry('д', "d"),
            Map.entry('е', "e"), Map.entry('ё', "e"), Map.entry('ж', "zh"), Map.entry('з', "z"), Map.entry('и', "i"),
            Map.entry('й', "y"), Map.entry('к', "k"), Map.entry('л', "l"), Map.entry('м', "m"), Map.entry('н', "n"),
            Map.entry('о', "o"), Map.entry('п', "p"), Map.entry('р', "r"), Map.entry('с', "s"), Map.entry('т', "t"),
            Map.entry('у', "u"), Map.entry('ф', "f"), Map.entry('х', "kh"), Map.entry('ц', "ts"), Map.entry('ч', "ch"),
            Map.entry('ш', "sh"), Map.entry('щ', "sch"), Map.entry('ъ', ""), Map.entry('ы', "y"), Map.entry('ь', ""),
            Map.entry('э', "e"), Map.entry('ю', "yu"), Map.entry('я', "ya"));

    private static String translit(String value) {
        var sb = new StringBuilder();
        for (char c : value.toLowerCase().toCharArray()) {
            sb.append(TRANSLIT.getOrDefault(c, String.valueOf(c)));
        }
        return sb.toString();
    }
}
