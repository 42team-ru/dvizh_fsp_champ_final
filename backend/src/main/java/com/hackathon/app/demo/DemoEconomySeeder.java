package com.hackathon.app.demo;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.demo.DemoBulkSeeder.Person;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventKind;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.service.EventService;
import com.hackathon.app.service.MeetingAttendance;
import com.hackathon.app.service.OrganizationAwardService;
import com.hackathon.app.service.RegistrationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Прошлое основных персонажей и итоги экономики. Здесь нет ни одной «нарисованной» монеты, вещи, достижения или
 * награды: прошедшие встречи создаются и посещаются обычными сервисами, а монеты, достижения, вехи организаций и
 * «Организацию месяца» создаёт настоящая обработка ({@link DemoHistory}, {@link OrganizationAwardService}).
 * <ul>
 * <li>Пётр провёл шесть встреч в разные дни, на каждую пришли 3+ человека с давними аккаунтами;</li>
 * <li>Анна ходила на встречи разных видов спорта, в том числе клуба «Хищные бобры»;</li>
 * <li>«Ладья» весь прошлый месяц (и предыдущий) проводила встречи, к которым возвращались одни и те же люди.</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
class DemoEconomySeeder {

	/** Место встречи: адрес и точка на карте. */
	private record Spot(String address, double lat, double lon) {
	}

	private static final Spot PARK = new Spot("Красноярск, Центральный парк, площадка у фонтана", 56.0118, 92.8790);
	private static final Spot TATYSHEV = new Spot("Красноярск, остров Татышев, футбольное поле у центрального входа", 56.0275, 92.9301);
	private static final Spot HALL = new Spot("Красноярск, улица Урицкого, 61, спортзал школы", 56.0127, 92.8864);
	private static final Spot QUAY = new Spot("Красноярск, Центральная набережная, у Часовни", 56.0097, 92.8890);
	private static final Spot COURTYARD = new Spot("Красноярск, улица Ленина, 113, двор", 56.0140, 92.8560);
	private static final Spot CLUB = new Spot("Красноярск, улица Карла Маркса, 49, клуб «Ладья»", 56.0110, 92.8830);
	private static final Spot CAMPUS = new Spot("Красноярск, студенческий городок, спортивный зал", 56.0100, 92.8700);

	private static final List<String> CLUB_TITLES = List.of("Клубный вечер «Ладьи»: свободная игра",
			"Разбор партий с тренером", "Шахматы для начинающих", "Турнир выходного дня", "Партии на время: блиц",
			"Решаем задачи и этюды", "Командный матч клуба", "Игра с часами для всех");

	private final EventService eventService;
	private final RegistrationService registrationService;
	private final OrganizationAwardService awards;
	private final DemoDataRepository data;
	private final DemoHistory history;
	private final Clock clock;

	/** Прошедшие встречи основных персонажей ставятся в историю; people — массовка, из неё приходят в «Ладью». */
	void schedulePast(DemoCast cast, List<Person> people) {
		var anna = cast.id("anna");
		var petr = cast.id("petr");
		var olga = cast.id("olga");
		var dmitry = cast.id("dmitry");
		var elena = cast.id("elena");
		var sergey = cast.id("sergey");
		var nikolai = cast.id("nikolai");

		// Пётр: шесть своих встреч в разные дни; на каждой 3+ человека со старыми аккаунтами.
		meeting(cast, petr, "Шахматы", "Шахматная партия в парке",
				"Живые шахматы в парке: сыграем несколько партий и разберём дебюты.", PARK, -3, 17, 2,
				List.of(anna, olga, dmitry, nikolai));
		meeting(cast, petr, "Шахматы", "Вечер быстрых шахмат", "Играем быстрые партии, меняем соперников каждый тур.",
				PARK, -6, 18, 2, List.of(anna, sergey, elena, nikolai));
		meeting(cast, petr, "Футбол", "Дворовый футбол по выходным", "Играем два тайма, команды делим на месте.",
				TATYSHEV, -8, 12, 2, List.of(dmitry, sergey, elena, anna));
		meeting(cast, petr, "Шахматы", "Разбор партий для начинающих", "Разбираем простые партии и типичные ошибки.",
				PARK, -10, 18, 2, List.of(olga, anna, dmitry));
		meeting(cast, petr, "Баскетбол", "Разминочная игра 3×3", "Короткие игры 3×3, мяч есть.",
				HALL, -13, 19, 2, List.of(sergey, dmitry, nikolai, olga));
		meeting(cast, petr, "Шахматы", "Блиц на скамейках", "Блиц на открытом воздухе, доски приносим сами.",
				PARK, -15, 17, 2, List.of(anna, olga, elena));

		// Елена и Ольга: свои встречи.
		meeting(cast, elena, "Бег", "Субботняя пробежка", "Спокойные 5 км в разговорном темпе.", QUAY, -12, 8, 1,
				List.of(dmitry, olga, sergey, nikolai));
		meeting(cast, olga, "Зарядка", "Зарядка во дворе: утренний выпуск", "Простые упражнения под музыку.",
				COURTYARD, -2, 9, 1, List.of(nikolai, elena, dmitry));
		meeting(cast, olga, "Зарядка", "Зарядка для всех возрастов", "Можно выполнять сидя на скамейке.",
				COURTYARD, -5, 9, 1, List.of(elena, nikolai, sergey));

		// «Хищные бобры»: встречи организации; на них ходит Анна («Свой бобр»).
		var bobry = cast.id("bobry");
		meeting(cast, bobry, "Хоккей", "Тренировка «Хищных бобров»: хоккей без льда",
				"Открытая тренировка студенческого клуба: общая физическая подготовка и игра.", CAMPUS, -4, 19, 2,
				List.of(dmitry, sergey, elena, anna));
		meeting(cast, bobry, "Баскетбол", "Открытая игра «Хищных бобров»", "Товарищеская игра 3×3, приходите всей командой.",
				CAMPUS, -7, 18, 2, List.of(sergey, nikolai, elena, anna));

		scheduleClubHistory(cast, people);
		scheduleCollector(cast, people);
	}

	/** Виды спорта встреч Виктории по кругу. */
	private static final List<String> COLLECTOR_SPORTS = List.of("Бег", "Футбол", "Баскетбол", "Йога", "Волейбол", "Бадминтон");

	/**
	 * Виктория зарабатывает на весь гардероб бобра так же, как любой пользователь. Полтора месяца она проводит по две
	 * встречи в день (больше за день не платят) с 10+ гостями — это потолок награды организатору, и корона за проведённые
	 * встречи. Сама ходит на 10 чужих встреч, одна из них у «Хищных бобров»: медаль и «Свой бобр». Покупки — в
	 * {@link DemoPetSeeder#dressCollector}.
	 */
	private void scheduleCollector(DemoCast cast, List<Person> people) {
		var vika = cast.id("vika");
		// гости — самые давние аккаунты массовки: им точно больше суток к любой встрече
		var guests = people.stream().sorted(Comparator.comparing(Person::signedUpAt)).limit(40).map(Person::id).toList();
		var today = LocalDate.ofInstant(clock.instant(), MeetingAttendance.ZONE);
		int meeting = 0;
		for (int daysAgo = 50; daysAgo >= 6; daysAgo--) {
			for (int hour : new int[] {10, 18}) {
				var sport = COLLECTOR_SPORTS.get(meeting % COLLECTOR_SPORTS.size());
				var start = today.minusDays(daysAgo).atTime(hour, 0).atZone(MeetingAttendance.ZONE).toInstant();
				var invited = rotate(guests, meeting * 3, 10);
				history.add(start, start.plus(Duration.ofHours(1)), () -> create(cast, vika, sport, sport + " с Викторией",
						"Открытая тренировка: разминка, игра и заминка. Приходите с друзьями.", PARK, start, 1, invited));
				meeting++;
			}
		}
		// чужие встречи, куда ходит Виктория: девять у людей из массовки и одна у «Хищных бобров»
		for (int i = 0; i < 9; i++) {
			var host = guests.get(30 + i);
			var start = today.minusDays(48 - i * 4).atTime(20, 0).atZone(MeetingAttendance.ZONE).toInstant();
			var invited = new ArrayList<>(rotate(guests, i * 2, 4));
			invited.add(vika);
			history.add(start, start.plus(Duration.ofHours(1)), () -> create(cast, host, "Настольный теннис",
					"Вечерний настольный теннис", "Играем на вылет, ракетки есть.", HALL, start, 1, invited));
		}
		var bobryStart = today.minusDays(9).atTime(20, 0).atZone(MeetingAttendance.ZONE).toInstant();
		history.add(bobryStart, bobryStart.plus(Duration.ofHours(2)), () -> create(cast, cast.id("bobry"), "Хоккей",
				"Вечерняя тренировка «Хищных бобров»", "Открытая тренировка клуба для всех желающих.", CAMPUS, bobryStart, 2,
				List.of(vika, guests.get(0), guests.get(1), guests.get(2))));
	}

	/**
	 * «Ладья» два месяца подряд проводит встречи. В позапрошлом месяце на них ходят постоянные гости, в прошлом —
	 * они же (возвращаются) и новые. Кто победит в «Организации месяца», решает счёт по настоящим правилам.
	 */
	private void scheduleClubHistory(DemoCast cast, List<Person> people) {
		var now = clock.instant();
		var ladya = cast.id("ladya");
		var previous = YearMonth.from(now.atZone(MeetingAttendance.ZONE)).minusMonths(1).atDay(1);
		var twoMonthsAgo = previous.minusMonths(1);
		// Гости клуба: сначала красноярцы, потом остальные, самые старые аккаунты первыми.
		var pool = people.stream()
				.sorted(Comparator.comparing((Person p) -> !"Красноярск".equals(p.city().name()))
						.thenComparing(Person::signedUpAt))
				.limit(44).map(Person::id).toList();
		var regulars = pool.subList(0, 22);
		int[] earlier = {2, 8, 14, 21};
		for (int i = 0; i < earlier.length; i++) {
			clubMeeting(cast, ladya, twoMonthsAgo.plusDays(earlier[i]), i, rotate(regulars, i * 5, 10));
		}
		int[] last = {1, 4, 8, 11, 15, 18, 22, 26};
		for (int i = 0; i < last.length; i++) {
			clubMeeting(cast, ladya, previous.plusDays(last[i]), i + earlier.length, rotate(pool, i * 6, 13));
		}
	}

	private void clubMeeting(DemoCast cast, UUID ladya, LocalDate day, int index, List<UUID> guests) {
		var start = day.atTime(18, 0).atZone(MeetingAttendance.ZONE).toInstant();
		history.add(start, start.plus(Duration.ofHours(2)), () -> create(cast, ladya, "Шахматы",
				CLUB_TITLES.get(index % CLUB_TITLES.size()), "Открытая встреча клуба: можно прийти без записи в клуб.",
				CLUB, start, 2, guests));
	}

	/** count людей подряд из списка по кругу, начиная со смещения. */
	private static List<UUID> rotate(List<UUID> list, int from, int count) {
		var result = new ArrayList<UUID>();
		for (int i = 0; i < count; i++) {
			result.add(list.get((from + i) % list.size()));
		}
		return result;
	}

	private void meeting(DemoCast cast, UUID authorId, String sport, String title, String description, Spot spot,
			int daysAgo, int hour, int hours, List<UUID> participants) {
		var day = LocalDate.ofInstant(clock.instant(), MeetingAttendance.ZONE).plusDays(daysAgo);
		var start = day.atTime(hour, 0).atZone(MeetingAttendance.ZONE).toInstant();
		history.add(start, start.plus(Duration.ofHours(hours)), () -> create(cast, authorId, sport, title, description,
				spot, start, hours, participants));
	}

	/**
	 * Встреча и запись на неё — обычные вызовы сервисов, как у пользователей (сервис не принимает прошлое, поэтому
	 * встреча рождается с датой в будущем). Потом метки времени переезжают на настоящие даты в прошлом.
	 */
	private void create(DemoCast cast, UUID authorId, String sport, String title, String description, Spot spot,
			Instant start, int hours, List<UUID> participants) {
		var end = start.plus(Duration.ofHours(hours));
		var temporaryStart = clock.instant().plus(Duration.ofDays(2));
		var request = new EventRequest(title, description, null, sport, temporaryStart,
				temporaryStart.plus(Duration.ofHours(hours)), EventFormat.OFFLINE, spot.address(), null, null,
				spot.lat(), spot.lon(), EventLevel.ANY, EventKind.GAME, null, null, null, JoinMode.FREE, null, null, null);
		var eventId = eventService.create(authorId, request).id();
		var createdAt = start.minus(Duration.ofDays(5));
		var authorSince = cast.since(authorId).plus(Duration.ofHours(2));
		if (createdAt.isBefore(authorSince)) {
			createdAt = authorSince;
		}
		var guests = participants.stream().filter(p -> cast.since(p).isBefore(start.minus(Duration.ofDays(1)))).toList();
		for (int i = 0; i < guests.size(); i++) {
			var guest = guests.get(i);
			var registration = registrationService.create(eventId, guest, null);
			var from = createdAt.isAfter(cast.since(guest)) ? createdAt : cast.since(guest).plus(Duration.ofHours(1));
			var registeredAt = from.plus(Duration.between(from, start).dividedBy(guests.size() + 2).multipliedBy(i + 1));
			data.backdateRegistration(registration.id(), registeredAt, registeredAt);
		}
		data.moveEvent(eventId, createdAt, start, end);
	}

	/**
	 * Прошлый месяц закончился: сервер предлагает «Организацию месяца» (как в первый день месяца), а админ
	 * подтверждает через тот же метод, что и кнопка в админке.
	 */
	void confirmMonthAward(UUID adminId) {
		awards.proposePreviousMonth();
		var now = clock.instant();
		var previous = YearMonth.from(now.atZone(MeetingAttendance.ZONE)).minusMonths(1);
		var proposal = awards.forAdmin(previous);
		log.info("Demo organization of the month, {}: candidates={}", previous, proposal.candidates());
		if (proposal.award() == null) {
			return;
		}
		var firstDay = YearMonth.from(now.atZone(MeetingAttendance.ZONE)).atDay(1).atTime(3, 0)
				.atZone(MeetingAttendance.ZONE).toInstant();
		if (firstDay.isAfter(now)) {
			firstDay = now;
		}
		data.backdateAward(proposal.award().id(), firstDay);
		data.flushAndClear();
		awards.confirm(proposal.award().id(), adminId);
	}
}
