package com.hackathon.app.demo;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hackathon.app.demo.DemoBulkData.City;
import com.hackathon.app.demo.DemoBulkData.Club;
import com.hackathon.app.demo.DemoBulkData.Qa;
import com.hackathon.app.demo.DemoBulkData.Template;
import com.hackathon.app.demo.DemoBulkData.Venue;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.service.AdminEventService;
import com.hackathon.app.service.AdminOrganizationService;
import com.hackathon.app.service.CommentService;
import com.hackathon.app.service.EventOrganizerService;
import com.hackathon.app.service.EventService;
import com.hackathon.app.service.OrganizationService;
import com.hackathon.app.service.OrganizationSubscriptionService;
import com.hackathon.app.service.RegistrationService;
import com.hackathon.app.service.NotificationReminderService;
import com.hackathon.app.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Массовые демо-данные («живой проект»), только при DEMO_MODE=true: сотни людей в 12 городах с датами регистрации
 * за полгода, клубы во всех статусах допуска, мероприятия на реальных площадках (прошедшие и будущие, часть снята
 * админом), записи и заявки, соорганизаторы, обсуждения.
 * <p>
 * Всё, что видно в приложении, получено обычными сервисами, как у настоящего пользователя: анкета клуба → решение
 * админа, создание мероприятия, запись, решение по заявке, сообщения и ответы, снятие админом. Монеты, достижения и
 * награды клубов здесь не создаются вообще: их начисляет настоящая обработка встреч ({@link DemoHistory}).
 * Исключения ради скорости, ни одно не создаёт невозможного состояния: сами строки аккаунтов массовки (с одним
 * общим хешем пароля, bcrypt на сотни аккаунтов долгий) и перенос дат в прошлое ({@link DemoDataRepository}).
 * Генерация детерминированная (фиксированный seed), даты — от сегодняшнего дня, поэтому демо не устаревает.
 */
@Slf4j
@Service
@RequiredArgsConstructor
class DemoBulkSeeder {

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
    /** Доля людей с фото в профиле: портрет или снимок с тренировки. */
    private static final double PORTRAIT_SHARE = 0.4;
    /** Доля мероприятий, к которым организатор загрузил фото. */
    private static final double EVENT_PHOTO_SHARE = 0.6;
    private static final List<String> OUTDOOR_NOTES = List.of("Встречаемся у главного входа",
            "У информационного стенда", "Ищите людей в ярких футболках", "У скамеек возле кафе");
    private static final List<String> INDOOR_NOTES = List.of("На входе скажите, что на нашу тренировку",
            "Раздевалки слева от входа, зал на втором этаже", "Сбор в холле у ресепшена");

    private final DemoProperties props;
    private final AppUserRepository users;
    private final DemoDataRepository data;
    private final DemoHistory history;
    private final DemoPetSeeder pets;
    private final OrganizationService organizationService;
    private final OrganizationSubscriptionService subscriptions;
    private final AdminOrganizationService adminOrganizationService;
    private final EventService eventService;
    private final RegistrationService registrationService;
    private final CommentService commentService;
    private final EventOrganizerService organizerService;
    private final AdminEventService adminEventService;
    private final UserProfileService profileService;
    private final NotificationReminderService reminders;
    private final DemoPhotos photos;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    /** Человек или аккаунт клуба: где живёт и когда присоединился. */
    record Person(UUID id, String username, City city, Instant signedUpAt, boolean female) {
    }

    /** Одобренный клуб и его аккаунт — автор событий клуба. */
    private record ApprovedClub(Person account, UUID organizationId, Club club) {
    }

    /** Что и когда произойдёт: автор, клуб (если от имени клуба), город, шаблон, начало. */
    private record Plan(Person author, UUID organizationId, City city, Template template, Instant startAt, Venue venue,
            int photos) {
    }

    /** Подвинуть запись или заявку во времени: когда подана и когда решена. */
    private record RegistrationAt(UUID id, Instant createdAt, Instant decidedAt) {
    }

    /** Подвинуть сообщение во времени: когда написано, когда исправлено или удалено. */
    private record CommentAt(UUID id, Instant createdAt, Instant editedAt, Instant deletedAt) {
    }

    /** Состояние одного прогона: генератор случайных чисел, «сейчас», счётчики для лога. */
    private final class Run {
        final Random random = new Random(SEED);
        final Instant now = clock.instant();
        List<Person> people;
        Map<String, List<Person>> peopleByCity;
        UUID adminId;
        int events;
        int registrations;
        int comments;
        long startedAt = System.currentTimeMillis();

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

    private Run run;

    /**
     * Люди и клубы создаются сразу, а мероприятия ставятся в историю ({@link DemoHistory}) и произойдут при её
     * проигрывании. Возвращает людей: часть из них потом ходит на встречи основных клубов.
     */
    List<Person> seed(DemoCast cast, UUID adminId) {
        run = new Run();
        run.adminId = adminId;
        var passwordHash = passwordEncoder.encode(props.password()); // один хеш на всех: bcrypt на сотни аккаунтов долгий
        var people = createPeople(run, passwordHash, cast);
        var clubs = createClubs(run, passwordHash, adminId, cast);
        clubs.stream().limit(2).forEach(club -> {
            subscriptions.change(club.organizationId(), cast.id("anna"), true);
            people.stream().limit(4).forEach(person -> subscriptions.change(club.organizationId(), person.id(), true));
        });
        run.people = people;
        run.peopleByCity = people.stream().collect(Collectors.groupingBy(p -> p.city().name()));

        var plans = new ArrayList<Plan>();
        for (var city : DemoBulkData.CITIES) {
            var locals = run.peopleByCity.getOrDefault(city.name(), List.of());
            // только то, для чего в городе есть подходящая площадка: хоккей — на льду, сапы — на воде
            var hosted = DemoBulkData.TEMPLATES.stream().filter(t -> !t.online() && city.hosts(t)).toList();
            for (int i = 0; i < city.weight() * EVENTS_PER_CITY_WEIGHT && !locals.isEmpty(); i++) {
                var template = run.pick(hosted);
                plans.add(plan(run, run.pick(locals), null, city, template));
            }
        }
        for (var club : clubs) {
            var templates = DemoBulkData.TEMPLATES.stream()
                    .filter(t -> !t.online() && t.sport().equals(club.club().sport()) && club.account().city().hosts(t))
                    .toList();
            int count = run.between(3, 6);
            for (int i = 0; i < count && !templates.isEmpty(); i++) {
                plans.add(plan(run, club.account(), club.organizationId(), club.account().city(), run.pick(templates)));
            }
        }
        var onlineTemplates = DemoBulkData.TEMPLATES.stream().filter(Template::online).toList();
        for (int i = 0; i < ONLINE_EVENTS; i++) {
            var author = run.pick(people);
            plans.add(plan(run, author, null, author.city(), run.pick(onlineTemplates)));
        }
        // Фото раздаются заранее и вперемешку: иначе их разобрали бы самые ранние по времени встречи.
        var withPhotos = new ArrayList<Plan>();
        var shuffled = new ArrayList<>(plans);
        Collections.shuffle(shuffled, run.random);
        for (var plan : shuffled) {
            int wanted = run.chance(EVENT_PHOTO_SHARE) ? run.between(1, 2) : 0;
            var indoor = plan.venue() == null || plan.venue().indoor();
            int granted = wanted == 0 ? 0 : photos.reserveBulk(plan.template().sport(), indoor, wanted);
            withPhotos.add(new Plan(plan.author(), plan.organizationId(), plan.city(), plan.template(), plan.startAt(),
                    plan.venue(), granted));
        }
        for (var plan : withPhotos) {
            var endAt = plan.startAt().plus(Duration.ofMinutes(plan.template().durationMinutes()));
            history.add(plan.startAt(), endAt, () -> execute(run, plan, endAt));
        }
        return people;
    }

    /** Итог массового сида для лога; вызывается после проигрывания истории. */
    void logSummary() {
        log.info("Demo bulk data: {} people, {} clubs, {} events, {} registrations, {} comments in {} ms",
                run.people.size(), DemoBulkData.CLUBS.size(), run.events, run.registrations, run.comments,
                System.currentTimeMillis() - run.startedAt);
    }

    // --- Пользователи и клубы ---

    private List<Person> createPeople(Run run, String passwordHash, DemoCast cast) {
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
            people.add(new Person(user.getId(), username, city, signedUpAt, female));
            cast.remember(user.getId(), signedUpAt);
        }
        data.flushAndClear();
        avatars(run, people);
        return people;
    }

    /** Клубы через обычные сервисы (анкета → решение админа), потом даты сдвигаются в прошлое. */
    private List<ApprovedClub> createClubs(Run run, String passwordHash, UUID adminId, DemoCast cast) {
        var approved = new ArrayList<ApprovedClub>();
        for (var club : DemoBulkData.CLUBS) {
            var city = DemoBulkData.CITIES.stream().filter(c -> c.name().equals(club.city())).findFirst().orElseThrow();
            int daysAgo = switch (club.status()) {
                case APPROVED -> run.between(90, 175);
                case REJECTED -> run.between(15, 60);
                case REVISION -> run.between(5, 12);
                case PENDING -> run.between(1, 6);
            };
            var signedUpAt = run.now.minus(Duration.ofDays(daysAgo)).minus(Duration.ofHours(run.between(1, 10)));
            var account = users.save(userMapper.toLocalUser(UUID.randomUUID(), club.username(),
                    club.username() + "@demo.local", passwordHash, club.contactFirstName(), club.contactLastName(),
                    city.name(), null, SystemRole.ORG, signedUpAt));
            cast.remember(account.getId(), signedUpAt);
            var organizationId = organizationService.saveMine(account.getId(),
                    new SaveOrganizationRequest(club.name(), club.description(), city.name(), club.contacts(),
                            List.of(), List.of(club.sport()))).id();
            var submittedAt = signedUpAt.plus(Duration.ofHours(run.between(1, 20)));
            var reviewedAt = club.status() == OrganizationStatus.PENDING ? null
                    : submittedAt.plus(Duration.ofHours(run.between(3, 50)));
            switch (club.status()) {
                case APPROVED -> adminOrganizationService.approve(organizationId, adminId);
                case REJECTED -> adminOrganizationService.reject(organizationId, adminId, club.rejectReason());
                case REVISION -> adminOrganizationService.returnForRevision(organizationId, adminId, club.rejectReason());
                case PENDING -> {
                }
            }
            var logo = photos.clubLogo(club.sport());
            if (logo != null) {
                organizationService.uploadLogo(account.getId(), logo);
            }
            data.backdateOrganization(organizationId, submittedAt, reviewedAt);
            if (club.status() == OrganizationStatus.APPROVED) {
                // события клуб публикует только после одобрения: для них «присоединился» = одобрен
                approved.add(new ApprovedClub(new Person(account.getId(), club.username(), city, reviewedAt, false),
                        organizationId, club));
            }
        }
        data.flushAndClear();
        return approved;
    }

    // --- Мероприятия ---

    /** Когда мероприятие состоится: 45% прошедших (история записей и обсуждений), остальные — в ближайшие полтора месяца. */
    private Plan plan(Run run, Person author, UUID organizationId, City city, Template template) {
        var zone = city.zone();
        var today = LocalDate.ofInstant(run.now, zone);
        int dayOffset = run.chance(0.45) ? -run.between(1, 60) : run.between(1, 45);
        var startAt = today.plusDays(dayOffset).atTime(run.pick(template.hours()), run.chance(0.7) ? 0 : 30)
                .atZone(zone).toInstant();
        var earliestCreated = author.signedUpAt().plus(Duration.ofHours(2));
        if (!startAt.minus(Duration.ofDays(1)).isAfter(earliestCreated)) {
            // автор присоединился позже — переносим в будущее
            startAt = today.plusDays(run.between(2, 30)).atTime(run.pick(template.hours()), 0).atZone(zone).toInstant();
        }
        // площадка под вид спорта; точка — сама площадка, без случайного сдвига (иначе метка уезжает в реку)
        Venue venue = template.online() ? null
                : run.pick(city.venues().stream().filter(v -> v.fits(template)).toList());
        return new Plan(author, organizationId, city, template, startAt, venue, 0);
    }

    /** Одно мероприятие со всем, что вокруг него происходит, в порядке настоящей жизни (через сервисы). */
    private void execute(Run run, Plan plan, Instant endAt) {
        var author = plan.author();
        var city = plan.city();
        var template = plan.template();
        var startAt = plan.startAt();
        boolean past = startAt.isBefore(run.now);
        var earliestCreated = author.signedUpAt().plus(Duration.ofHours(2));
        var latestCreated = run.now.minus(Duration.ofHours(1));
        var createdAt = startAt.minus(Duration.ofDays(run.between(2, 21))).minus(Duration.ofHours(run.between(0, 12)));
        if (createdAt.isAfter(latestCreated)) {
            // событие далеко впереди: опубликовано когда-то за последние три недели, а не «прямо сейчас» всем скопом
            createdAt = run.between(max(earliestCreated, run.now.minus(Duration.ofDays(21))), latestCreated);
        }
        createdAt = clamp(createdAt, earliestCreated, latestCreated);

        var venue = plan.venue();
        Integer capacity = template.maxCapacity() > 0 ? run.between(template.minCapacity(), template.maxCapacity()) : null;
        var joinMode = run.chance(template.requestShare()) ? JoinMode.REQUEST : JoinMode.FREE;
        // Сервис не создаёт прошедшую встречу: она рождается с датой в будущем и переезжает в прошлое в самом конце.
        var createStart = past ? run.now.plus(Duration.ofDays(2)) : startAt;
        var createEnd = createStart.plus(Duration.ofMinutes(template.durationMinutes()));
        var request = new EventRequest(run.pick(template.titles()), template.description(), null, template.sport(),
                createStart, createEnd,
                template.online() ? EventFormat.ONLINE : EventFormat.OFFLINE,
                venue == null ? null : venue.address(),
                venue == null ? null : venue.name() + (run.chance(0.5)
                        ? ". " + run.pick(venue.indoor() ? INDOOR_NOTES : OUTDOOR_NOTES) : ""),
                template.online() ? "https://meet.example.com/" + Long.toString(run.random.nextLong() & 0xFFFFFFFFL, 36) : null,
                venue == null ? null : venue.lat(),
                venue == null ? null : venue.lon(),
                run.pick(template.levels()), template.kind(), template.requirements(), template.equipment(), capacity,
                joinMode, "Чат участников: https://t.me/+" + Long.toString(run.random.nextLong() & 0xFFFFFFFFFFL, 36),
                null, null);
        var eventId = eventService.create(author.id(), request).id();
        // организатор загрузил фото: обложка в ленте и галерея в карточке
        for (var photo : photos.bulk(template.sport(), venue == null || venue.indoor(), plan.photos())) {
            eventService.addPhoto(eventId, author.id(), photo, null);
        }

        // соорганизатор у части событий частных лиц
        UUID coOrganizerId = null;
        var locals = run.peopleByCity.getOrDefault(city.name(), run.people);
        Instant coOrganizerAt = null;
        if (plan.organizationId() == null && run.chance(0.12)) {
            var candidate = run.pick(locals);
            if (!candidate.id().equals(author.id()) && candidate.signedUpAt().isBefore(createdAt)) {
                organizerService.add(eventId, author.id(), candidate.username());
                organizerService.accept(eventId, candidate.id());
                coOrganizerId = candidate.id();
                coOrganizerAt = createdAt.plus(Duration.ofHours(1));
            }
        }

        var registrationTimes = new ArrayList<RegistrationAt>();
        var commentTimes = new ArrayList<CommentAt>();
        var participants = register(run, eventId, joinMode, capacity, author.id(), coOrganizerId, createdAt, startAt,
                locals, run.people, registrationTimes);
        discuss(run, eventId, template, venue, author.id(), coOrganizerId, createdAt, startAt, endAt, participants,
                locals, commentTimes);

        // модерация: немного снятых и удалённых, с причиной
        Instant moderatedAt = null;
        double roll = run.random.nextDouble();
        if (roll < 0.06) {
            var status = roll < 0.04 ? EventStatus.UNPUBLISHED : EventStatus.DELETED;
            var reason = run.pick(status == EventStatus.UNPUBLISHED ? DemoBulkData.UNPUBLISH_REASONS : DemoBulkData.DELETE_REASONS);
            if (status == EventStatus.UNPUBLISHED) {
                adminEventService.unpublish(eventId, run.adminId, reason);
            } else {
                adminEventService.delete(eventId, run.adminId, reason);
            }
            moderatedAt = run.between(createdAt.plus(Duration.ofHours(6)), min(startAt, run.now));
        }

        // Все действия выше уже совершены обычными сервисами; теперь только метки времени переезжают в прошлое.
        data.moveEvent(eventId, createdAt, startAt, endAt);
        reminders.synchronize(eventId); // напоминания ставились на временную дату — пересчитать по настоящей
        registrationTimes.forEach(t -> data.backdateRegistration(t.id(), t.createdAt(), t.decidedAt()));
        commentTimes.forEach(t -> data.backdateComment(t.id(), t.createdAt(), t.editedAt(), t.deletedAt()));
        if (coOrganizerId != null) {
            data.backdateOrganizer(eventId, coOrganizerId, coOrganizerAt);
        }
        if (moderatedAt != null) {
            data.backdateModeration(eventId, moderatedAt);
        }
        run.events++;
    }

    /** Записи и заявки во всех статусах; возвращает подтверждённых участников (для обсуждения). */
    private List<UUID> register(Run run, UUID eventId, JoinMode joinMode, Integer capacity, UUID authorId,
            UUID coOrganizerId, Instant createdAt, Instant startAt, List<Person> locals, List<Person> people,
            List<RegistrationAt> times) {
        boolean past = startAt.isBefore(run.now);
        var windowEnd = min(startAt, run.now).minus(Duration.ofMinutes(15));
        boolean request = joinMode == JoinMode.REQUEST;
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
            if (!seatsLeft) {
                break; // когда мест нет, записаться или подать заявку нельзя (правило сервиса)
            }
            if (!request) {
                var registration = registrationService.create(eventId, person.id(), null);
                var decidedAt = registeredAt;
                if (run.chance(0.08)) {
                    registrationService.cancel(eventId, person.id());
                    decidedAt = run.between(registeredAt, windowEnd);
                } else {
                    confirmed.add(person.id());
                }
                times.add(new RegistrationAt(registration.id(), registeredAt, decidedAt));
            } else {
                var message = run.chance(0.6) ? run.pick(DemoBulkData.REQUEST_MESSAGES) : null;
                var registration = registrationService.create(eventId, person.id(), message);
                var decidedAt = registeredAt.plus(Duration.ofHours(run.between(1, 40)));
                if (past && !decidedAt.isBefore(windowEnd)) {
                    decidedAt = run.between(registeredAt, windowEnd); // к началу организатор успел решить все заявки
                }
                boolean decided = past || (decidedAt.isBefore(windowEnd) && run.chance(0.75));
                if (decided) {
                    if (seatsLeft && run.chance(0.78)) {
                        registrationService.approve(registration.id(), authorId);
                        confirmed.add(person.id());
                    } else {
                        registrationService.reject(registration.id(), authorId, run.pick(DemoBulkData.REJECT_REASONS));
                    }
                }
                times.add(new RegistrationAt(registration.id(), registeredAt, decided ? decidedAt : null));
            }
            run.registrations++;
        }
        return confirmed;
    }

    /**
     * Вопросы и ответы организатора до начала — про этот вид спорта и эту площадку (сменка — в зал, дождь — на улицу,
     * ссылка — онлайн); реплики участников между собой; после прошедших — отзывы.
     */
    private void discuss(Run run, UUID eventId, Template template, Venue venue, UUID authorId, UUID coOrganizerId,
            Instant createdAt, Instant startAt, Instant endAt, List<UUID> participants, List<Person> locals,
            List<CommentAt> times) {
        if (!run.chance(0.6)) {
            return;
        }
        var questions = new ArrayList<Qa>(DemoBulkData.SPORT_QUESTIONS.getOrDefault(template.sport(), List.of()));
        questions.addAll(List.copyOf(questions)); // вопросы по делу встречаются чаще общих
        questions.addAll(venue == null ? DemoBulkData.ONLINE_QUESTIONS : DemoBulkData.QUESTIONS);
        if (venue != null) {
            questions.addAll(venue.indoor() ? DemoBulkData.INDOOR_QUESTIONS : DemoBulkData.OUTDOOR_QUESTIONS);
        }
        int threads = run.between(1, 3);
        var asked = new HashSet<Qa>();
        for (int i = 0; i < threads; i++) {
            var qa = run.pick(questions);
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
            var questionId = say(run, eventId, askerId, qa.question(), askedAt, null, times);
            var answeredAt = askedAt.plus(Duration.ofMinutes(run.between(10, 600)));
            if (run.chance(0.85) && answeredAt.isBefore(run.now)) {
                // организатор отвечает именно на вопрос — с цитатой, как в мессенджере
                var answerer = coOrganizerId != null && run.chance(0.3) ? coOrganizerId : authorId;
                var answerId = say(run, eventId, answerer, qa.answer(), answeredAt, questionId, times);
                var thanksAt = answeredAt.plus(Duration.ofMinutes(run.between(5, 180)));
                if (run.chance(0.35) && thanksAt.isBefore(run.now)) {
                    say(run, eventId, askerId, run.pick(DemoBulkData.THANKS), thanksAt, answerId, times);
                }
            }
            var echoAt = askedAt.plus(Duration.ofMinutes(run.between(5, 300)));
            if (!locals.isEmpty() && run.chance(0.2) && echoAt.isBefore(run.now)) {
                var echoerId = run.pick(locals).id();
                if (!echoerId.equals(askerId) && !echoerId.equals(authorId)) {
                    say(run, eventId, echoerId, run.pick(DemoBulkData.ECHOES), echoAt, questionId, times);
                }
            }
        }
        var chatterFrom = createdAt.plus(Duration.ofHours(2));
        var chatterTo = min(startAt, run.now).minus(Duration.ofHours(2));
        if (venue != null && participants.size() > 1 && run.chance(0.35) && chatterFrom.isBefore(chatterTo)) {
            say(run, eventId, run.pick(participants), run.pick(DemoBulkData.CHATTER), run.between(chatterFrom, chatterTo),
                    null, times);
        }
        if (endAt.plus(Duration.ofHours(1)).isBefore(run.now) && !participants.isEmpty() && run.chance(0.5)) {
            var reviews = new ArrayList<Qa>(DemoBulkData.AFTER_EVENT);
            reviews.addAll(DemoBulkData.SPORT_AFTER.getOrDefault(template.sport(), List.of()));
            var qa = run.pick(reviews);
            var saidAt = run.between(endAt.plus(Duration.ofMinutes(30)), min(endAt.plus(Duration.ofDays(2)), run.now));
            var reviewId = say(run, eventId, run.pick(participants), qa.question(), saidAt, null, times);
            var answeredAt = saidAt.plus(Duration.ofMinutes(run.between(15, 300)));
            if (answeredAt.isBefore(run.now)) {
                say(run, eventId, authorId, qa.answer(), answeredAt, reviewId, times);
            }
        }
    }

    /** Сообщение (replyToId — ответ на него). Изредка автор его правит или удаляет — как в живом чате. */
    private UUID say(Run run, UUID eventId, UUID authorId, String text, Instant at, UUID replyToId, List<CommentAt> times) {
        var id = commentService.create(eventId, authorId, text, replyToId).id();
        var laterAt = at.plus(Duration.ofMinutes(run.between(1, 30)));
        Instant editedAt = null;
        Instant deletedAt = null;
        if (laterAt.isBefore(run.now)) {
            double roll = run.random.nextDouble();
            if (roll < 0.06) {
                commentService.update(eventId, id, authorId, text + " " + run.pick(DemoBulkData.EDIT_TAILS));
                editedAt = laterAt;
            } else if (roll < 0.3 && DemoBulkData.ECHOES.contains(text)) { // удаляют только реплики, на которые не отвечали
                commentService.delete(eventId, id, authorId);
                deletedAt = laterAt;
            }
        }
        times.add(new CommentAt(id, at, editedAt, deletedAt));
        run.comments++;
        return id;
    }

    // --- Фото профиля ---

    /**
     * Аватары, как их ставят люди: у части — портрет, остальные без фото.
     * Портреты не повторяются, пока не кончится запас.
     */
    private void avatars(Run run, List<Person> people) {
        var women = photos.portraits(true);
        var men = photos.portraits(false);
        int nextWoman = 0;
        int nextMan = 0;
        for (var person : people) {
            double roll = run.random.nextDouble();
            var portraits = person.female() ? women : men;
            int next = person.female() ? nextWoman : nextMan;
            if (roll < PORTRAIT_SHARE && next < portraits.size()) {
                profileService.uploadAvatar(person.id(), portraits.get(next));
                if (person.female()) {
                    nextWoman++;
                } else {
                    nextMan++;
                }
            }
        }
        data.flushAndClear();
    }

    // --- Бобры ---

    /** Образ у двух третей людей: болеют за местные клубы, остальное — по настроению. Покупают на свои монеты. */
    void dress(List<Person> people) {
        var random = new Random(SEED + 1);
        for (var person : people) {
            if (random.nextDouble() >= 0.66) {
                continue;
            }
            var shop = pets.catalogFor(person.id());
            var outfit = new LinkedHashMap<String, String>();
            var shirts = pets.codes(shop, "shirt");
            if (!shirts.isEmpty() && random.nextDouble() < 0.85) {
                var local = person.city().shirts().stream().filter(shirts::contains).toList();
                outfit.put("shirt", !local.isEmpty() && random.nextDouble() < 0.6
                        ? local.get(random.nextInt(local.size())) : shirts.get(random.nextInt(shirts.size())));
            }
            for (var slot : pets.outfitSlots(shop)) {
                var codes = pets.codes(shop, slot);
                if (!slot.equals("shirt") && !codes.isEmpty() && random.nextDouble() < (slot.equals("hat") ? 0.45 : 0.15)) {
                    outfit.put(slot, codes.get(random.nextInt(codes.size())));
                }
            }
            var activities = pets.codes(shop, "activity");
            var activity = random.nextDouble() < 0.3 || activities.isEmpty() ? "none"
                    : activities.get(random.nextInt(activities.size()));
            pets.dress(person.id(), activity, outfit);
        }
        data.flushAndClear();
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
