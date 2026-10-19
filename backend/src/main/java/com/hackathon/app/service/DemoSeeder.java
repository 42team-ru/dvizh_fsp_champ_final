package com.hackathon.app.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.config.DemoProperties;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventKind;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.mapper.EventMapper;
import com.hackathon.app.domain.mapper.OrganizerMapper;
import com.hackathon.app.domain.mapper.RegistrationMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.EventOrganizerRepository;
import com.hackathon.app.repository.EventRepository;
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

	/** Демо-аккаунт; onLoginPage — показывать кнопкой на странице входа (массовка для списков участников — нет). */
	record Account(String username, String firstName, String lastName, SystemRole role, String bio,
			boolean onLoginPage) {

		String email() {
			return username + "@demo.local";
		}
	}

	static final List<Account> ACCOUNTS = List.of(
			new Account("admin", "Администратор", "Платформы", SystemRole.ADMIN, null, true),
			new Account("anna", "Анна", "Смирнова", SystemRole.USER,
					"Только начинаю: хочу бегать по утрам и попробовать что-то новое", true),
			new Account("petr", "Пётр", "Волков", SystemRole.USER,
					"Играю в шахматы с детства, по выходным — футбол", true),
			new Account("olga", "Ольга", "Морозова", SystemRole.USER,
					"На пенсии, каждое утро делаю зарядку и зову соседей", true),
			new Account("dmitry", "Дмитрий", "Орлов", SystemRole.USER, "Футбол и бег", false),
			new Account("elena", "Елена", "Кузнецова", SystemRole.USER, "Бегаю полумарафоны", false),
			new Account("sergey", "Сергей", "Белов", SystemRole.USER, "Волейбол, футбол, шахматы", false),
			new Account("nikolai", "Николай", "Лебедев", SystemRole.USER, "Привёз петанк из Франции", false));

	private final DemoProperties props;
	private final AppUserRepository users;
	private final EventRepository events;
	private final RegistrationRepository registrations;
	private final EventOrganizerRepository organizers;
	private final SportService sportService;
	private final UserMapper userMapper;
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

		// Сценарии 1 и 3: свободная запись от пользователя, есть соорганизатор и участники.
		var football = event(ids.get("dmitry"), "Футбол", new EventRequest(
				"Футбол 5×5 на Татышеве",
				"Играем в мини-футбол два тайма по 25 минут. Команды делим на месте, мяч и манишки есть.",
				null, null, at(2, 19, 0), at(2, 21, 0), EventFormat.OFFLINE,
				CITY + ", остров Татышев, футбольное поле у центрального входа", "Синие ворота, встречаемся у скамеек",
				null, 56.0275, 92.9301, EventLevel.AMATEUR, EventKind.GAME,
				"Уверенно держите мяч, играем без грубости", "Сменная обувь (шиповки или сороконожки), вода",
				14, JoinMode.FREE, "Чат игры: https://t.me/demo_football_tatyshev"));
		if (football != null) {
			coOrganizer(football, ids.get("nikolai"));
			confirmed(football, ids.get("petr"), now);
			confirmed(football, ids.get("sergey"), now);
			confirmed(football, ids.get("elena"), now);
		}

		// Сценарий 4: запись по заявке — автор Пётр, заявки в обоих исходах и ждущие решения.
		var chess = event(ids.get("petr"), "Шахматы", new EventRequest(
				"Блиц-турнир по шахматам для любителей",
				"Швейцарская система, 7 туров, контроль 5+3. Подойдёт тем, кто знает правила и хочет живых соперников.",
				null, null, at(3, 18, 30), at(3, 21, 30), EventFormat.OFFLINE,
				CITY + ", проспект Мира, 10, читальный зал", "Вход со двора, второй этаж",
				null, 56.0105, 92.8710, EventLevel.AMATEUR, EventKind.AMATEUR_TOURNAMENT,
				"Знать правила и уметь пользоваться часами", "Доски и часы есть, свои тоже приносите",
				12, JoinMode.REQUEST, "Точная аудитория и жеребьёвка: https://t.me/demo_chess_blitz"));
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
				null, JoinMode.FREE, null));
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
				null, JoinMode.FREE, null));
		if (morningExercise != null) {
			confirmed(morningExercise, ids.get("nikolai"), now);
			confirmed(morningExercise, ids.get("elena"), now);
		}

		// Сценарий 1, вторая часть: нишевый вид, которого нет в справочнике, создаётся как custom.
		var petanque = event(ids.get("nikolai"), "Петанк", new EventRequest(
				"Петанк в парке: научим за 10 минут",
				"Французская игра с металлическими шарами. Правила объясню на месте, шары дам.",
				null, null, at(4, 17, 0), at(4, 19, 0), EventFormat.OFFLINE,
				CITY + ", Центральный парк, площадка у фонтана", null,
				null, 56.0118, 92.8790, EventLevel.BEGINNER, EventKind.MEETUP,
				null, null,
				10, JoinMode.FREE, null));
		if (petanque != null) {
			confirmed(petanque, ids.get("olga"), now);
			confirmed(petanque, ids.get("anna"), now);
		}

		// Сценарий 6: снятое с публикации — нет в ленте, у записавшейся Анны видно с причиной.
		var volleyball = event(ids.get("sergey"), "Волейбол", new EventRequest(
				"Пляжный волейбол на Татышеве",
				"Играем 2×2 и 4×4, сетка своя.",
				null, null, at(5, 18, 0), at(5, 20, 0), EventFormat.OFFLINE,
				CITY + ", остров Татышев, пляжные площадки", null,
				null, 56.0262, 92.9420, EventLevel.AMATEUR, EventKind.GAME,
				null, "Купальник или шорты, вода",
				8, JoinMode.FREE, null));
		if (volleyball != null) {
			confirmed(volleyball, ids.get("anna"), now);
			eventMapper.moderate(volleyball, EventStatus.UNPUBLISHED,
					"Площадки закрыты на ремонт до конца месяца, а другое место организатор не указал",
					now, ids.get("admin"));
			events.save(volleyball);
		}
	}

	/** Логин → id; недостающие аккаунты создаются с общим демо-паролем. */
	private Map<String, UUID> seedAccounts() {
		var ids = new HashMap<String, UUID>();
		for (var account : ACCOUNTS) {
			var existing = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(account.username(), account.email());
			var user = existing.orElseGet(() -> users.save(userMapper.toLocalUser(UUID.randomUUID(),
					account.username(), account.email(), passwordEncoder.encode(props.password()),
					account.firstName(), account.lastName(), CITY, account.bio(), account.role(), clock.instant())));
			ids.put(account.username(), user.getId());
		}
		return ids;
	}

	/** Новое мероприятие или null, если у автора такое уже есть (тогда и записи на него не трогаем). */
	private Event event(UUID authorId, String sportName, EventRequest request) {
		if (events.existsByAuthorIdAndTitle(authorId, request.title())) {
			return null;
		}
		var sport = sportService.resolve(null, sportName, authorId);
		return events.save(eventMapper.toEntity(request, authorId, sport.getId()));
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
