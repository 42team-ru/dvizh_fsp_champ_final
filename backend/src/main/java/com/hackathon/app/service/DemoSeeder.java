package com.hackathon.app.service;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.config.DemoProperties;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.dto.ScheduleRequest;
import com.hackathon.app.domain.dto.ScheduleRuleRequest;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.ContactType;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventKind;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.mapper.CommentMapper;
import com.hackathon.app.domain.mapper.EventMapper;
import com.hackathon.app.domain.mapper.OccurrenceMapper;
import com.hackathon.app.domain.mapper.OrganizerMapper;
import com.hackathon.app.domain.mapper.RegistrationMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.CommentRepository;
import com.hackathon.app.repository.EventOrganizerRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.OccurrenceAttendanceRepository;
import com.hackathon.app.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Демо-данные для экспертов: аккаунты всех ролей, мероприятия в Красноярске и записи на них, чтобы каждый сценарий
 * приёмки можно было пройти сразу после старта. Работает ТОЛЬКО при app.demo.enabled=true.
 * Идемпотентно: существующее не трогаем, недостающее создаём (аккаунт — по логину, мероприятие — по автору и названию).
 * Даты считаются от текущего дня («послезавтра в 19:00»), поэтому демо не устаревает. Полный сброс: docker compose down -v.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DemoSeeder {

	/** Мероприятия проходят в Красноярске: «в 19:00» — по местному времени. */
	private static final ZoneId CITY_ZONE = ZoneId.of("Asia/Krasnoyarsk");
	private static final String CITY = "Красноярск";

	/**
	 * Демо-аккаунт; onLoginPage — показывать кнопкой на странице входа (массовка для списков участников — нет);
	 * daysAgo — сколько дней назад зарегистрировался, чтобы у проекта была история.
	 */
	record Account(String username, String firstName, String lastName, SystemRole role, String bio,
			boolean onLoginPage, int daysAgo) {

		String email() {
			return username + "@demo.local";
		}
	}

	static final List<Account> ACCOUNTS = List.of(
			new Account("admin", "Администратор", "Платформы", SystemRole.ADMIN, null, true, 200),
			new Account("anna", "Анна", "Смирнова", SystemRole.USER,
					"Только начинаю: хочу бегать по утрам и попробовать что-то новое", true, 21),
			new Account("petr", "Пётр", "Волков", SystemRole.USER,
					"Играю в шахматы с детства, по выходным — футбол", true, 140),
			new Account("olga", "Ольга", "Морозова", SystemRole.USER,
					"На пенсии, каждое утро делаю зарядку и зову соседей", true, 95),
			new Account("dmitry", "Дмитрий", "Орлов", SystemRole.USER, "Футбол и бег", false, 160),
			new Account("elena", "Елена", "Кузнецова", SystemRole.USER, "Бегаю полумарафоны", false, 120),
			new Account("sergey", "Сергей", "Белов", SystemRole.USER, "Волейбол, футбол, шахматы", false, 180),
			new Account("nikolai", "Николай", "Лебедев", SystemRole.USER, "Привёз петанк из Франции", false, 75),
			// аккаунты организаций: имя и фамилия — контактное лицо
			new Account("ladya", "Игорь", "Савельев", SystemRole.ORG, null, true, 170),
			new Account("enisey", "Марина", "Соколова", SystemRole.ORG, null, true, 3),
			new Account("yoga", "Светлана", "Ким", SystemRole.ORG, null, false, 12));

	private final DemoProperties props;
	private final AppUserRepository users;
	private final EventRepository events;
	private final RegistrationRepository registrations;
	private final EventOrganizerRepository organizers;
	private final CommentRepository comments;
	private final SportService sportService;
	private final OccurrenceService occurrenceService;
	private final EventOccurrenceRepository occurrences;
	private final OccurrenceAttendanceRepository attendances;
	private final OccurrenceMapper occurrenceMapper;
	private final ScheduleExpander scheduleExpander;
	private final OrganizationService organizationService;
	private final AdminOrganizationService adminOrganizationService;
	private final DemoPetSeeder demoPets;
	private final DemoBulkSeeder demoBulk;
	private final UserMapper userMapper;
	private final CommentMapper commentMapper;
	private final EventMapper eventMapper;
	private final RegistrationMapper registrationMapper;
	private final OrganizerMapper organizerMapper;
	private final PasswordEncoder passwordEncoder;
	private final Clock clock;

	@EventListener(ApplicationReadyEvent.class)
	@Transactional
	public void seed() {
		if (!props.enabled()) {
			return;
		}
		log.warn("ДЕМО-РЕЖИМ включён: доступен вход без пароля в тестовые аккаунты. Не использовать с реальными данными.");
		var ids = seedAccounts();
		var now = clock.instant();

		// Сценарий 2: одобренный клуб с событиями, заявка на проверке (одобрить или отклонить), отказ с причиной.
		var ladya = organization(ids.get("ladya"), new SaveOrganizationRequest("Шахматный клуб «Ладья»",
				"Любительский шахматный клуб: турниры по выходным, занятия для начинающих и детей.", CITY,
				Map.of(ContactType.TELEGRAM, "@ladya_krsk", ContactType.PHONE, "+7 391 200-10-10")),
				OrganizationStatus.APPROVED, null, ids.get("admin"));
		organization(ids.get("enisey"), new SaveOrganizationRequest("Беговое сообщество «Енисей»",
				"Бегаем по набережной три раза в неделю, готовимся к полумарафонам вместе.", CITY,
				Map.of(ContactType.TELEGRAM, "@enisey_run", ContactType.WEBSITE, "https://enisey-run.example.com")),
				OrganizationStatus.PENDING, null, ids.get("admin"));
		organization(ids.get("yoga"), new SaveOrganizationRequest("Йога на Татышеве",
				"Йога на свежем воздухе.", CITY,
				Map.of(ContactType.PHONE, "+7 900 300-40-50")),
				OrganizationStatus.REJECTED,
				"Добавьте описание занятий, расписание и ссылку на группу или сайт, чтобы участники понимали, куда идут",
				ids.get("admin"));

		// Запись по заявке от организации: несколько заявок ждут решения клуба.
		var clubTournament = event(ids.get("ladya"), ladya, "Шахматы", new EventRequest(
				"Турнир клуба «Ладья» по быстрым шахматам",
				"Пять туров, контроль 10+5. Рейтинговый турнир клуба, приглашаем любителей.",
				null, null, at(6, 12, 0), at(6, 17, 0), EventFormat.OFFLINE,
				CITY + ", улица Карла Маркса, 49, клуб «Ладья»", "Третий этаж, кабинет 305",
				null, 56.0110, 92.8830, EventLevel.AMATEUR, EventKind.AMATEUR_TOURNAMENT,
				"Знать правила и нотацию", "Ничего: доски и часы клуба",
				16, JoinMode.REQUEST, "Жеребьёвка и чат участников: https://t.me/ladya_tournament", null, null));
		if (clubTournament != null) {
			pending(clubTournament, ids.get("olga"), "Играла в молодости, хочу вспомнить");
			pending(clubTournament, ids.get("nikolai"), "Есть второй разряд");
			pending(clubTournament, ids.get("dmitry"), null);
			var notationQuestion = comment(clubTournament, ids.get("elena"), "Нужно ли уметь записывать партии?");
			reply(clubTournament, ids.get("ladya"), "Желательно, но не обязательно: бланки и подсказку по нотации дадим на месте.", notationQuestion);
		}
		var chessLesson = event(ids.get("ladya"), ladya, "Шахматы", new EventRequest(
				"Открытый урок шахмат для начинающих",
				"Разберём, как ходят фигуры, и сыграем первые партии с тренером клуба.",
				null, null, at(3, 11, 0), at(3, 12, 30), EventFormat.OFFLINE,
				CITY + ", улица Карла Маркса, 49, клуб «Ладья»", "Третий этаж, кабинет 305",
				null, 56.0110, 92.8830, EventLevel.BEGINNER, EventKind.TRAINING,
				"Никаких: учим с нуля", null,
				12, JoinMode.FREE, null, null, null));
		if (chessLesson != null) {
			confirmed(chessLesson, ids.get("anna"), now);
			confirmed(chessLesson, ids.get("elena"), now);
		}

		// Сценарии 1 и 3: свободная запись от пользователя, есть соорганизатор и участники.
		var football = event(ids.get("dmitry"), "Футбол", new EventRequest(
				"Футбол 5×5 на Татышеве",
				"Играем в мини-футбол два тайма по 25 минут. Команды делим на месте, мяч и манишки есть.",
				null, null, at(2, 19, 0), at(2, 21, 0), EventFormat.OFFLINE,
				CITY + ", остров Татышев, футбольное поле у центрального входа", "Синие ворота, встречаемся у скамеек",
				null, 56.0275, 92.9301, EventLevel.AMATEUR, EventKind.GAME,
				"Уверенно держите мяч, играем без грубости", "Сменная обувь (шиповки или сороконожки), вода",
				14, JoinMode.FREE, "Чат игры: https://t.me/demo_football_tatyshev", null, null));
		if (football != null) {
			coOrganizer(football, ids.get("nikolai"));
			confirmed(football, ids.get("sergey"), now);
			confirmed(football, ids.get("elena"), now);
			// Сценарий 5: вопрос участника, ответы автора и соорганизатора с меткой «Организатор».
			var annaQuestion = comment(football, ids.get("anna"), "Давно не играла, можно прийти просто попробовать?");
			var dmitryAnswer = reply(football, ids.get("dmitry"), "Конечно! Поставим в команду поопытнее, играем без жёстких стыков.", annaQuestion);
			reply(football, ids.get("nikolai"), "Возьмите сменную обувь: поле искусственное.", annaQuestion);
			reply(football, ids.get("anna"), "Спасибо! Тогда записываюсь 🙂", dmitryAnswer);
			comment(football, ids.get("sergey"), "Кто-нибудь едет от Октябрьского моста? Могу подхватить двоих");
		}

		// Сценарий 4: запись по заявке — автор Пётр, заявки в обоих исходах и ждущие решения.
		var chess = event(ids.get("petr"), "Шахматы", new EventRequest(
				"Блиц-турнир по шахматам для любителей",
				"Швейцарская система, 7 туров, контроль 5+3. Подойдёт тем, кто знает правила и хочет живых соперников.",
				null, null, at(3, 18, 30), at(3, 21, 30), EventFormat.OFFLINE,
				CITY + ", проспект Мира, 10, читальный зал", "Вход со двора, второй этаж",
				null, 56.0105, 92.8710, EventLevel.AMATEUR, EventKind.AMATEUR_TOURNAMENT,
				"Знать правила и уметь пользоваться часами", "Доски и часы есть, свои тоже приносите",
				12, JoinMode.REQUEST, "Точная аудитория и жеребьёвка: https://t.me/demo_chess_blitz", null, null));
		if (chess != null) {
			pending(chess, ids.get("anna"), "Играю с дедушкой, хочу попробовать турнир");
			pending(chess, ids.get("dmitry"), "Рейтинг на lichess около 1500");
			pending(chess, ids.get("elena"), null);
			decided(chess, ids.get("sergey"), RegistrationStatus.CONFIRMED, "Был на прошлом турнире", null,
					ids.get("petr"), now);
			decided(chess, ids.get("nikolai"), RegistrationStatus.REJECTED, "Хочу сыграть",
					"Турнир для любителей, а у вас разряд — приходите на открытый в следующем месяце",
					ids.get("petr"), now);
		}

		var run = event(ids.get("elena"), "Бег", new EventRequest(
				"Утренняя пробежка по набережной",
				"Спокойные 5 км в разговорном темпе, никто не отстаёт. После — растяжка.",
				null, null, at(1, 7, 0), at(1, 8, 0), EventFormat.OFFLINE,
				CITY + ", Центральная набережная, у Часовни", null,
				null, 56.0097, 92.8890, EventLevel.BEGINNER, EventKind.TRAINING,
				null, "Удобные кроссовки, вода",
				null, JoinMode.FREE, null, null, null));
		if (run != null) {
			confirmed(run, ids.get("anna"), now);
			confirmed(run, ids.get("dmitry"), now);
		}

		var morningExercise = event(ids.get("olga"), "Зарядка", new EventRequest(
				"Зарядка во дворе для всех возрастов",
				"Пятнадцать минут простых упражнений под музыку. Можно выполнять сидя на скамейке.",
				null, null, at(1, 9, 0), at(1, 9, 30), EventFormat.OFFLINE,
				CITY + ", улица Ленина, 113, двор", "Площадка за детской горкой",
				null, 56.0140, 92.8560, EventLevel.ANY, EventKind.TRAINING,
				"Никаких: подойдёт любой уровень и возраст", "Коврик по желанию",
				null, JoinMode.FREE, null, null, null));
		if (morningExercise != null) {
			confirmed(morningExercise, ids.get("nikolai"), now);
			confirmed(morningExercise, ids.get("elena"), now);
		}

		// Сценарий 1, вторая часть: нишевый вид, которого нет в справочнике, создаётся как custom.
		// Кворум 4 при двух записавшихся: «Состоится, если наберём 4».
		var petanque = event(ids.get("nikolai"), "Петанк", new EventRequest(
				"Петанк в парке: научим за 10 минут",
				"Французская игра с металлическими шарами. Правила объясню на месте, шары дам.",
				null, null, at(4, 17, 0), at(4, 19, 0), EventFormat.OFFLINE,
				CITY + ", Центральный парк, площадка у фонтана", null,
				null, 56.0118, 92.8790, EventLevel.BEGINNER, EventKind.MEETUP,
				null, null,
				10, JoinMode.FREE, null, null, 4));
		if (petanque != null) {
			confirmed(petanque, ids.get("olga"), now);
			confirmed(petanque, ids.get("anna"), now);
		}

		// Повторяющееся мероприятие: серия с двумя правилами, отметками на даты и одним отменённым занятием.
		// Кворум 3 на занятие: первое набрано (трое отметились), следующие — собираем.
		var today = LocalDate.now(clock.withZone(CITY_ZONE));
		var firstTuesday = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.TUESDAY));
		var firstSunday = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
		var basketball = seriesEvent(ids.get("petr"), "Баскетбол", new EventRequest(
				"Баскетбол по вечерам",
				"Регулярные игры 3×3 и 5×5 в школьном зале. Вступите в серию и отмечайте, на какие даты придёте.",
				null, null, null, null, EventFormat.OFFLINE,
				CITY + ", улица Урицкого, 61, спортзал школы", "Вход со стороны стадиона, охране сказать «на баскетбол»",
				null, 56.0127, 92.8864, EventLevel.AMATEUR, EventKind.TRAINING,
				"Знать правила, играть без грубости", "Сменная обувь для зала, вода",
				10, JoinMode.FREE, "Чат серии: https://t.me/demo_basketball_evenings",
				new ScheduleRequest(CITY_ZONE.getId(), today, today.plusMonths(3), List.of(
						new ScheduleRuleRequest(firstTuesday.atTime(20, 0), 90, "FREQ=WEEKLY;BYDAY=TU"),
						new ScheduleRuleRequest(firstSunday.atTime(14, 0), 120, "FREQ=WEEKLY;INTERVAL=2;BYDAY=SU"))), 3));
		if (basketball != null) {
			confirmed(basketball, ids.get("anna"), now);
			confirmed(basketball, ids.get("sergey"), now);
			confirmed(basketball, ids.get("dmitry"), now);
			var dates = occurrences.findByEventIdOrderByStartAt(basketball.getId());
			attend(dates.get(0), ids.get("anna"));
			attend(dates.get(0), ids.get("sergey"));
			attend(dates.get(0), ids.get("dmitry"));
			attend(dates.get(1), ids.get("anna"));
			attend(dates.get(2), ids.get("sergey"));
			var cancelled = dates.get(3);
			attend(cancelled, ids.get("anna"));
			occurrenceMapper.cancel(cancelled, "Зал занят: в школе соревнования", now, ids.get("petr"));
			occurrences.save(cancelled);
			var sundayQuestion = comment(basketball, ids.get("anna"), "Если пропущу вторник, можно прийти в воскресенье?");
			reply(basketball, ids.get("petr"), "Да, отмечайтесь на любые даты — главное, чтобы были места.", sundayQuestion);
		}

		// Сценарий 6: снятое с публикации — нет в ленте, у записавшейся Елены видно с причиной.
		var volleyball = event(ids.get("sergey"), "Волейбол", new EventRequest(
				"Пляжный волейбол на Татышеве",
				"Играем 2×2 и 4×4, сетка своя.",
				null, null, at(5, 18, 0), at(5, 20, 0), EventFormat.OFFLINE,
				CITY + ", остров Татышев, пляжные площадки", null,
				null, 56.0262, 92.9420, EventLevel.AMATEUR, EventKind.GAME,
				null, "Купальник или шорты, вода",
				8, JoinMode.FREE, null, null, null));
		if (volleyball != null) {
			confirmed(volleyball, ids.get("elena"), now);
			comment(volleyball, ids.get("anna"), "А когда будет следующая игра?");
			eventMapper.moderate(volleyball, EventStatus.UNPUBLISHED,
					"Площадки закрыты на ремонт до конца месяца, а другое место организатор не указал",
					now, ids.get("admin"));
			events.save(volleyball);
		}

		// Бобр: готовые образы из встроенного гардероба.
		demoPets.seed(ids);

		// Живой проект: сотни людей в 12 городах, клубы, мероприятия, записи и обсуждения за полгода.
		demoBulk.seed(ids);
	}

	/** Логин → id; недостающие аккаунты создаются с общим демо-паролем. */
	private Map<String, UUID> seedAccounts() {
		var ids = new HashMap<String, UUID>();
		for (var account : ACCOUNTS) {
			var existing = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(account.username(), account.email());
			var user = existing.orElseGet(() -> users.save(userMapper.toLocalUser(UUID.randomUUID(),
					account.username(), account.email(), passwordEncoder.encode(props.password()),
					account.firstName(), account.lastName(), CITY, account.bio(), account.role(),
					clock.instant().minus(Duration.ofDays(account.daysAgo())))));
			ids.put(account.username(), user.getId());
		}
		return ids;
	}

	/**
	 * Анкета организации через обычный сервис (статус PENDING) и решение админа. Уже поданную не трогаем.
	 * Возвращает id организации.
	 */
	private UUID organization(UUID accountId, SaveOrganizationRequest request, OrganizationStatus decision,
			String rejectReason, UUID adminId) {
		var existing = organizationService.forAccount(accountId);
		if (existing != null) {
			return existing.getId();
		}
		var organizationId = organizationService.saveMine(accountId, request).id();
		switch (decision) {
			case APPROVED -> adminOrganizationService.approve(organizationId, adminId);
			case REJECTED -> adminOrganizationService.reject(organizationId, adminId, rejectReason);
			case PENDING -> {
			} // ждёт решения: эксперт одобрит или отклонит сам
		}
		return organizationId;
	}

	/** Мероприятие частного лица. */
	private Event event(UUID authorId, String sportName, EventRequest request) {
		return event(authorId, null, sportName, request);
	}

	/** Новое мероприятие или null, если у автора такое уже есть (тогда и записи на него не трогаем). */
	private Event event(UUID authorId, UUID organizationId, String sportName, EventRequest request) {
		if (events.existsByAuthorIdAndTitle(authorId, request.title())) {
			return null;
		}
		var sport = sportService.resolve(null, sportName, authorId);
		var saved = events.saveAndFlush(eventMapper.toEntity(request, authorId, sport.getId(), organizationId,
				request.startAt(), request.endAt()));
		occurrenceService.apply(saved, null, clock.instant());
		return saved;
	}

	/** Повторяющееся мероприятие: расписание разворачивается в занятия, как при создании через API. */
	private Event seriesEvent(UUID authorId, String sportName, EventRequest request) {
		if (events.existsByAuthorIdAndTitle(authorId, request.title())) {
			return null;
		}
		var now = clock.instant();
		var plan = scheduleExpander.expand(request.schedule());
		var first = plan.after(now).getFirst();
		var sport = sportService.resolve(null, sportName, authorId);
		var saved = events.saveAndFlush(eventMapper.toEntity(request, authorId, sport.getId(), null, first.start(),
				first.end()));
		occurrenceService.apply(saved, plan, now);
		return saved;
	}

	/** Отметка «приду» участника серии на занятие. */
	private void attend(EventOccurrence occurrence, UUID userId) {
		attendances.save(occurrenceMapper.toAttendance(occurrence.getId(), occurrence.getEventId(), userId));
	}

	/** Сообщение в общий поток. saveAndFlush по одному: порядок createdAt — порядок реплик в обсуждении. */
	private UUID comment(Event event, UUID authorId, String text) {
		return reply(event, authorId, text, null);
	}

	/** Ответ на сообщение replyToId (цитата над ответом). */
	private UUID reply(Event event, UUID authorId, String text, UUID replyToId) {
		return comments.saveAndFlush(commentMapper.toEntity(event.getId(), authorId, text, replyToId)).getId();
	}

	private void coOrganizer(Event event, UUID userId) {
		organizers.save(organizerMapper.toEntity(event.getId(), userId, event.getAuthorId()));
	}

	/** Свободная запись: подтверждена сразу, без решения организатора. */
	private void confirmed(Event event, UUID userId, Instant now) {
		registrations.save(registrationMapper.toRegistration(event.getId(), userId, RegistrationStatus.CONFIRMED,
				null, now));
	}

	private void pending(Event event, UUID userId, String message) {
		registrations.save(registrationMapper.toRegistration(event.getId(), userId, RegistrationStatus.PENDING,
				message, null));
	}

	/** Заявка, по которой организатор уже решил. */
	private void decided(Event event, UUID userId, RegistrationStatus status, String message, String reason,
			UUID organizerId, Instant now) {
		Registration registration = registrationMapper.toRegistration(event.getId(), userId,
				RegistrationStatus.PENDING, message, null);
		registrations.save(registrationMapper.decide(registration, status, reason, now, organizerId));
	}

	/** Через days дней от сегодняшнего (по Красноярску) в hour:minute местного времени. */
	private Instant at(int days, int hour, int minute) {
		return LocalDate.now(clock.withZone(CITY_ZONE)).plusDays(days).atTime(hour, minute).atZone(CITY_ZONE)
				.toInstant();
	}
}
