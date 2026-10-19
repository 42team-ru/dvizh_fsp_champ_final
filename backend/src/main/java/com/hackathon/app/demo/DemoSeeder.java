package com.hackathon.app.demo;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.dto.RegisterRequest;
import com.hackathon.app.domain.dto.RegistrationResponse;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.domain.dto.SaveUserSportsRequest;
import com.hackathon.app.domain.dto.ScheduleRequest;
import com.hackathon.app.domain.dto.ScheduleRuleRequest;
import com.hackathon.app.domain.dto.UpdateProfileRequest;
import com.hackathon.app.domain.dto.UserSportRequest;
import com.hackathon.app.domain.enums.AccountType;
import com.hackathon.app.domain.enums.ContactType;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventKind;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.service.AchievementService;
import com.hackathon.app.service.AdminEventService;
import com.hackathon.app.service.AdminOrganizationService;
import com.hackathon.app.service.AuthService;
import com.hackathon.app.service.CommentService;
import com.hackathon.app.service.EventOrganizerService;
import com.hackathon.app.service.EventService;
import com.hackathon.app.service.OccurrenceService;
import com.hackathon.app.service.OrganizationService;
import com.hackathon.app.service.RegistrationService;
import com.hackathon.app.service.UserProfileService;
import com.hackathon.app.service.UserSportService;
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
 * <p>
 * Принцип: демо ничего не рисует поверх, а делает то же, что люди через интерфейс, — вызывает те же сервисы, что и
 * REST-контроллеры (регистрация, анкета организации, решение админа, создание мероприятия, запись, решение по заявке,
 * сообщения и ответы, снятие админом, отметки в серии, покупки в магазине, образ бобра, «Организация месяца»).
 * Монеты, достижения, награды и вещи появляются только как следствие настоящей обработки прошедших встреч.
 * Единственный обман — время: сервисы не создают прошлое, поэтому прошедшие встречи создаются с будущими датами и
 * затем переносятся назад ({@link DemoDataRepository}); после этого их обрабатывает настоящий {@code RewardService}.
 * <p>
 * Всё выполняется одной транзакцией: либо демо создано целиком, либо (при сбое) откатывается, и следующий старт
 * повторит попытку. Повторный старт на заполненной базе ничего не создаёт. Даты считаются от текущего дня
 * («послезавтра в 19:00»), поэтому демо не устаревает. Полный сброс: docker compose down -v.
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
					"Играю в шахматы с детства, по выходным — футбол", false, 140),
			new Account("olga", "Ольга", "Морозова", SystemRole.USER,
					"На пенсии, каждое утро делаю зарядку и зову соседей", false, 95),
			new Account("dmitry", "Дмитрий", "Орлов", SystemRole.USER, "Футбол и бег", false, 160),
			new Account("elena", "Елена", "Кузнецова", SystemRole.USER, "Бегаю полумарафоны", false, 120),
			new Account("sergey", "Сергей", "Белов", SystemRole.USER, "Волейбол, футбол, шахматы", false, 180),
			new Account("nikolai", "Николай", "Лебедев", SystemRole.USER, "Привёз петанк из Франции", false, 75),
			// аккаунты организаций: имя и фамилия — контактное лицо
			new Account("ladya", "Игорь", "Савельев", SystemRole.ORG, null, true, 170),
			new Account("enisey", "Марина", "Соколова", SystemRole.ORG, null, true, 3),
			new Account("yoga", "Светлана", "Ким", SystemRole.ORG, null, false, 12),
			new Account("bobry", "Артём", "Громов", SystemRole.ORG, null, false, 90));

	private final DemoProperties props;
	private final AppUserRepository users;
	private final DemoDataRepository data;
	private final DemoHistory history;
	private final DemoBulkSeeder bulk;
	private final DemoEconomySeeder economy;
	private final DemoPetSeeder pets;
	private final DemoAlbumSeeder album;
	private final AuthService authService;
	private final UserProfileService profileService;
	private final UserSportService userSportService;
	private final OrganizationService organizationService;
	private final AdminOrganizationService adminOrganizationService;
	private final EventService eventService;
	private final RegistrationService registrationService;
	private final CommentService commentService;
	private final EventOrganizerService organizerService;
	private final OccurrenceService occurrenceService;
	private final AdminEventService adminEventService;
	private final UserMapper userMapper;
	private final PasswordEncoder passwordEncoder;
	private final Clock clock;

	@EventListener(ApplicationReadyEvent.class)
	@Transactional
	public void seed() {
		if (!props.enabled()) {
			return;
		}
		log.warn("ДЕМО-РЕЖИМ включён: доступен вход без пароля в тестовые аккаунты. Не использовать с реальными данными.");
		if (users.existsByUsernameIgnoreCase("admin")) {
			log.info("Demo data already present, nothing to seed");
			return;
		}
		long started = System.currentTimeMillis();
		var cast = seedAccounts();
		var adminId = cast.id("admin");

		// Сценарий 2: одобренный клуб, заявка на проверке (одобрить или отклонить), отказ с причиной, клуб «Хищные бобры».
		var ladya = organization(cast.id("ladya"), new SaveOrganizationRequest("Шахматный клуб «Ладья»",
				"Любительский шахматный клуб: турниры по выходным, занятия для начинающих и детей.", CITY,
				Map.of(ContactType.TELEGRAM, "@ladya_krsk", ContactType.PHONE, "+7 391 200-10-10")),
				OrganizationStatus.APPROVED, null, adminId, 168, 165);
		organization(cast.id("enisey"), new SaveOrganizationRequest("Беговое сообщество «Енисей»",
				"Бегаем по набережной три раза в неделю, готовимся к полумарафонам вместе.", CITY,
				Map.of(ContactType.TELEGRAM, "@enisey_run", ContactType.WEBSITE, "https://enisey-run.example.com")),
				OrganizationStatus.PENDING, null, adminId, 2, 0);
		organization(cast.id("yoga"), new SaveOrganizationRequest("Йога на Татышеве",
				"Йога на свежем воздухе.", CITY,
				Map.of(ContactType.PHONE, "+7 900 300-40-50")),
				OrganizationStatus.REJECTED,
				"Добавьте описание занятий, расписание и ссылку на группу или сайт, чтобы участники понимали, куда идти",
				adminId, 11, 10);
		var beavers = organization(cast.id("bobry"), new SaveOrganizationRequest("ССК ВГУ «Хищные бобры»",
				"Студенческий спортивный клуб: хоккей, баскетбол и общая физподготовка для всех желающих.", CITY,
				Map.of(ContactType.TELEGRAM, "@predatory_beavers")),
				OrganizationStatus.APPROVED, null, adminId, 88, 86);
		// Служебный код, по которому система узнаёт клуб («Свой бобр»), через API не задаётся.
		data.assignOrganizationCode(beavers, AchievementService.BEAVERS_ORGANIZATION_CODE);
		data.flushAndClear();

		// Массовка: люди, клубы и их мероприятия (ставятся в историю).
		var people = bulk.seed(cast, adminId);

		// Сценарий 2 и 4: турнир клуба по заявке и открытый урок.
		var clubTournament = event(cast.id("ladya"), "Шахматы", new EventRequest(
				"Турнир клуба «Ладья» по быстрым шахматам",
				"Пять туров, контроль 10+5. Рейтинговый турнир клуба, приглашаем любителей.",
				null, null, at(6, 12, 0), at(6, 17, 0), EventFormat.OFFLINE,
				CITY + ", улица Карла Маркса, 49, клуб «Ладья»", "Третий этаж, кабинет 305",
				null, 56.0110, 92.8830, EventLevel.AMATEUR, EventKind.AMATEUR_TOURNAMENT,
				"Знать правила и нотацию", "Ничего: доски и часы клуба",
				16, JoinMode.REQUEST, "Жеребьёвка и чат участников: https://t.me/ladya_tournament", null, null));
		join(clubTournament, cast.id("olga"), "Играла в молодости, хочу вспомнить");
		join(clubTournament, cast.id("nikolai"), "Есть второй разряд");
		join(clubTournament, cast.id("dmitry"), null);
		var notationQuestion = comment(clubTournament, cast.id("elena"), "Нужно ли уметь записывать партии?");
		reply(clubTournament, cast.id("ladya"), "Желательно, но не обязательно: бланки и подсказку по нотации дадим на месте.", notationQuestion);
		var chessLesson = event(cast.id("ladya"), "Шахматы", new EventRequest(
				"Открытый урок шахмат для начинающих",
				"Разберём, как ходят фигуры, и сыграем первые партии с тренером клуба.",
				null, null, at(3, 11, 0), at(3, 12, 30), EventFormat.OFFLINE,
				CITY + ", улица Карла Маркса, 49, клуб «Ладья»", "Третий этаж, кабинет 305",
				null, 56.0110, 92.8830, EventLevel.BEGINNER, EventKind.TRAINING,
				"Никаких: учим с нуля", null,
				12, JoinMode.FREE, null, null, null));
		join(chessLesson, cast.id("anna"), null);
		join(chessLesson, cast.id("elena"), null);
		event(cast.id("bobry"), "Хоккей", new EventRequest(
				"Тренировка «Хищных бобров»: набор новичков",
				"Приходите знакомиться: покажем, как проходят тренировки клуба.",
				null, null, at(4, 19, 0), at(4, 21, 0), EventFormat.OFFLINE,
				CITY + ", студенческий городок, спортивный зал", null,
				null, 56.0100, 92.8700, EventLevel.ANY, EventKind.TRAINING,
				null, "Сменная обувь", null, JoinMode.FREE, null, null, null));

		// Сценарии 1 и 3: свободная запись от пользователя, есть соорганизатор и участники.
		var football = event(cast.id("dmitry"), "Футбол", new EventRequest(
				"Футбол 5×5 на Татышеве",
				"Играем в мини-футбол два тайма по 25 минут. Команды делим на месте, мяч и манишки есть.",
				null, null, at(2, 19, 0), at(2, 21, 0), EventFormat.OFFLINE,
				CITY + ", остров Татышев, футбольное поле у центрального входа", "Синие ворота, встречаемся у скамеек",
				null, 56.0275, 92.9301, EventLevel.AMATEUR, EventKind.GAME,
				"Уверенно держите мяч, играем без грубости", "Сменная обувь (шиповки или сороконожки), вода",
				14, JoinMode.FREE, "Чат игры: https://t.me/demo_football_tatyshev", null, null));
		organizerService.add(football, cast.id("dmitry"), "nikolai");
		join(football, cast.id("sergey"), null);
		join(football, cast.id("elena"), null);
		// Сценарий 5: вопрос участника, ответы автора и соорганизатора с меткой «Организатор».
		var annaQuestion = comment(football, cast.id("anna"), "Давно не играла, можно прийти просто попробовать?");
		var dmitryAnswer = reply(football, cast.id("dmitry"), "Конечно! Поставим в команду поопытнее, играем без жёстких стыков.", annaQuestion);
		reply(football, cast.id("nikolai"), "Возьмите сменную обувь: поле искусственное.", annaQuestion);
		reply(football, cast.id("anna"), "Спасибо! Тогда записываюсь 🙂", dmitryAnswer);
		comment(football, cast.id("sergey"), "Кто-нибудь едет от Октябрьского моста? Могу подхватить двоих");

		// Сценарий 4: запись по заявке — автор Пётр, заявки в обоих исходах и ждущие решения.
		var chess = event(cast.id("petr"), "Шахматы", new EventRequest(
				"Блиц-турнир по шахматам для любителей",
				"Швейцарская система, 7 туров, контроль 5+3. Подойдёт тем, кто знает правила и хочет живых соперников.",
				null, null, at(3, 18, 30), at(3, 21, 30), EventFormat.OFFLINE,
				CITY + ", проспект Мира, 10, читальный зал", "Вход со двора, второй этаж",
				null, 56.0105, 92.8710, EventLevel.AMATEUR, EventKind.AMATEUR_TOURNAMENT,
				"Знать правила и уметь пользоваться часами", "Доски и часы есть, свои тоже приносите",
				12, JoinMode.REQUEST, "Точная аудитория и жеребьёвка: https://t.me/demo_chess_blitz", null, null));
		join(chess, cast.id("anna"), "Играю с дедушкой, хочу попробовать турнир");
		join(chess, cast.id("dmitry"), "Рейтинг на lichess около 1500");
		join(chess, cast.id("elena"), null);
		registrationService.approve(join(chess, cast.id("sergey"), "Был на прошлом турнире").id(), cast.id("petr"));
		registrationService.reject(join(chess, cast.id("nikolai"), "Хочу сыграть").id(), cast.id("petr"),
				"Турнир для любителей, а у вас разряд — приходите на открытый в следующем месяце");

		var run = event(cast.id("elena"), "Бег", new EventRequest(
				"Утренняя пробежка по набережной",
				"Спокойные 5 км в разговорном темпе, никто не отстаёт. После — растяжка.",
				null, null, at(1, 7, 0), at(1, 8, 0), EventFormat.OFFLINE,
				CITY + ", Центральная набережная, у Часовни", null,
				null, 56.0097, 92.8890, EventLevel.BEGINNER, EventKind.TRAINING,
				null, "Удобные кроссовки, вода",
				null, JoinMode.FREE, null, null, null));
		join(run, cast.id("anna"), null);
		join(run, cast.id("dmitry"), null);

		var morningExercise = event(cast.id("olga"), "Зарядка", new EventRequest(
				"Зарядка во дворе для всех возрастов",
				"Пятнадцать минут простых упражнений под музыку. Можно выполнять сидя на скамейке.",
				null, null, at(1, 9, 0), at(1, 9, 30), EventFormat.OFFLINE,
				CITY + ", улица Ленина, 113, двор", "Площадка за детской горкой",
				null, 56.0140, 92.8560, EventLevel.ANY, EventKind.TRAINING,
				"Никаких: подойдёт любой уровень и возраст", "Коврик по желанию",
				null, JoinMode.FREE, null, null, null));
		join(morningExercise, cast.id("nikolai"), null);
		join(morningExercise, cast.id("elena"), null);

		// Сценарий 1, вторая часть: нишевый вид, которого нет в справочнике, создаётся обычным путём как custom.
		// Кворум 4 при двух записавшихся: «Состоится, если наберём 4».
		var petanque = event(cast.id("nikolai"), "Петанк", new EventRequest(
				"Петанк в парке: научим за 10 минут",
				"Французская игра с металлическими шарами. Правила объясню на месте, шары дам.",
				null, null, at(4, 17, 0), at(4, 19, 0), EventFormat.OFFLINE,
				CITY + ", Центральный парк, площадка у фонтана", null,
				null, 56.0118, 92.8790, EventLevel.BEGINNER, EventKind.MEETUP,
				null, null,
				10, JoinMode.FREE, null, null, 4));
		join(petanque, cast.id("olga"), null);
		join(petanque, cast.id("anna"), null);

		// Повторяющееся мероприятие: серия с двумя правилами, отметками на даты и одним отменённым занятием.
		// Кворум 3 на занятие: первое набрано (трое отметились), следующие — собираем.
		var today = LocalDate.now(clock.withZone(CITY_ZONE));
		var firstTuesday = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.TUESDAY));
		var firstSunday = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
		var basketball = event(cast.id("petr"), "Баскетбол", new EventRequest(
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
		join(basketball, cast.id("anna"), null);
		join(basketball, cast.id("sergey"), null);
		join(basketball, cast.id("dmitry"), null);
		var dates = occurrenceService.list(basketball, cast.id("petr"), null, null);
		attend(basketball, dates.get(0).id(), "anna", "sergey", "dmitry", cast);
		attend(basketball, dates.get(1).id(), "anna", cast);
		attend(basketball, dates.get(2).id(), "sergey", cast);
		var cancelled = dates.get(3).id();
		attend(basketball, cancelled, "anna", cast);
		occurrenceService.cancel(basketball, cancelled, cast.id("petr"), "Зал занят: в школе соревнования");
		var sundayQuestion = comment(basketball, cast.id("anna"), "Если пропущу вторник, можно прийти в воскресенье?");
		reply(basketball, cast.id("petr"), "Да, отмечайтесь на любые даты — главное, чтобы были места.", sundayQuestion);

		// Сценарий 6: снятое с публикации — нет в ленте, у записавшейся Елены видно с причиной.
		var volleyball = event(cast.id("sergey"), "Волейбол", new EventRequest(
				"Пляжный волейбол на Татышеве",
				"Играем 2×2 и 4×4, сетка своя.",
				null, null, at(5, 18, 0), at(5, 20, 0), EventFormat.OFFLINE,
				CITY + ", остров Татышев, пляжные площадки", null,
				null, 56.0262, 92.9420, EventLevel.AMATEUR, EventKind.GAME,
				null, "Купальник или шорты, вода",
				8, JoinMode.FREE, null, null, null));
		join(volleyball, cast.id("elena"), null);
		comment(volleyball, cast.id("anna"), "А когда будет следующая игра?");
		adminEventService.unpublish(volleyball, adminId,
				"Площадки закрыты на ремонт до конца месяца, а другое место организатор не указал");

		// Виды спорта в профиле: у Анны, Петра и Ольги сразу работает лента «Для меня».
		sports(cast.id("anna"), SportLevel.BEGINNER, "Бег", "Йога");
		sports(cast.id("petr"), SportLevel.AMATEUR, "Шахматы", "Футбол", "Баскетбол");
		sports(cast.id("olga"), null, "Зарядка", "Петанк");
		data.flushAndClear();

		// Прошлое: встречи основных персонажей и клуба «Ладья», затем вся история по времени с настоящим начислением.
		economy.schedulePast(cast, people);
		history.replay();
		bulk.logSummary();

		// Итоги месяца и покупки: «Организацию месяца» подтверждает админ, бобры одеваются на заработанные монеты.
		economy.confirmMonthAward(adminId);
		pets.dressCore(cast);
		bulk.dress(people);
		album.seed(cast);
		log.info("Demo data seeded in {} ms", System.currentTimeMillis() - started);
	}

	/** Виды спорта в профиле с одним уровнем. */
	private void sports(UUID userId, SportLevel level, String... sportNames) {
		userSportService.save(userId, new SaveUserSportsRequest(Arrays.stream(sportNames)
				.map(name -> new UserSportRequest(null, name, level))
				.toList()));
	}

	/**
	 * Аккаунты: регистрация, как у человека (форма регистрации и профиль), затем дата регистрации уезжает в прошлое.
	 * Администратор через регистрацию не создаётся (так устроена система), поэтому он заводится строкой аккаунта.
	 */
	private DemoCast seedAccounts() {
		var cast = new DemoCast();
		var now = clock.instant();
		for (var account : ACCOUNTS) {
			UUID id;
			if (account.role() == SystemRole.ADMIN) {
				id = users.save(userMapper.toLocalUser(UUID.randomUUID(), account.username(), account.email(),
						passwordEncoder.encode(props.password()), account.firstName(), account.lastName(), CITY,
						account.bio(), account.role(), now)).getId();
			} else {
				id = authService.register(new RegisterRequest(account.username(), account.email(), account.firstName(),
						account.lastName(), props.password(),
						account.role() == SystemRole.ORG ? AccountType.ORG : AccountType.USER)).getId();
				profileService.update(id, new UpdateProfileRequest(account.firstName(), account.lastName(), CITY,
						account.bio()));
			}
			var signedUpAt = now.minus(Duration.ofDays(account.daysAgo()));
			data.backdateUser(id, signedUpAt);
			cast.add(account.username(), id, signedUpAt);
		}
		data.flushAndClear();
		return cast;
	}

	/**
	 * Анкета организации через обычный сервис (статус PENDING) и решение админа; даты подачи и решения уезжают в
	 * прошлое. Возвращает id организации.
	 */
	private UUID organization(UUID accountId, SaveOrganizationRequest request, OrganizationStatus decision,
			String rejectReason, UUID adminId, int submittedDaysAgo, int reviewedDaysAgo) {
		var organizationId = organizationService.saveMine(accountId, request).id();
		switch (decision) {
			case APPROVED -> adminOrganizationService.approve(organizationId, adminId);
			case REJECTED -> adminOrganizationService.reject(organizationId, adminId, rejectReason);
			case PENDING -> {
			} // ждёт решения: эксперт одобрит или отклонит сам
		}
		var now = clock.instant();
		data.backdateOrganization(organizationId, now.minus(Duration.ofDays(submittedDaysAgo)),
				decision == OrganizationStatus.PENDING ? null : now.minus(Duration.ofDays(reviewedDaysAgo)));
		return organizationId;
	}

	/** Мероприятие создаёт автор через обычный сервис; вид спорта — из справочника или свой (создаётся при создании). */
	private UUID event(UUID authorId, String sportName, EventRequest r) {
		return eventService.create(authorId, new EventRequest(r.title(), r.description(), null, sportName, r.startAt(),
				r.endAt(), r.format(), r.address(), r.locationNote(), r.onlineUrl(), r.lat(), r.lon(), r.level(),
				r.kind(), r.requirements(), r.equipment(), r.capacity(), r.joinMode(), r.privateDetails(),
				r.schedule(), r.minParticipants())).id();
	}

	/** Записаться: при свободной записи — сразу CONFIRMED, по заявке — PENDING. */
	private RegistrationResponse join(UUID eventId, UUID userId, String message) {
		return registrationService.create(eventId, userId, message);
	}

	/** Сообщение в общий поток. */
	private UUID comment(UUID eventId, UUID authorId, String text) {
		return reply(eventId, authorId, text, null);
	}

	/** Ответ на сообщение replyToId (цитата над ответом). */
	private UUID reply(UUID eventId, UUID authorId, String text, UUID replyToId) {
		return commentService.create(eventId, authorId, text, replyToId).id();
	}

	/** Отметки «приду» участников серии на занятие. */
	private void attend(UUID eventId, UUID occurrenceId, String first, String second, String third, DemoCast cast) {
		attend(eventId, occurrenceId, first, cast);
		attend(eventId, occurrenceId, second, cast);
		attend(eventId, occurrenceId, third, cast);
	}

	private void attend(UUID eventId, UUID occurrenceId, String username, DemoCast cast) {
		occurrenceService.attend(eventId, occurrenceId, cast.id(username));
	}

	/** Через days дней от сегодняшнего (по Красноярску) в hour:minute местного времени. */
	private Instant at(int days, int hour, int minute) {
		return LocalDate.now(clock.withZone(CITY_ZONE)).plusDays(days).atTime(hour, minute).atZone(CITY_ZONE)
				.toInstant();
	}
}
