package com.hackathon.app.service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.config.RecommendationProperties;
import com.hackathon.app.domain.dto.RecommendationFilter;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.entity.UserSport;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.enums.Daytime;
import com.hackathon.app.domain.enums.DismissReason;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RecommendationDismissalRepository;
import com.hackathon.app.repository.RecommendationRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.repository.UserPreferencesRepository;
import com.hackathon.app.repository.UserSportRepository;
import com.hackathon.app.util.Geo;
import com.hackathon.app.util.RecommendationMath;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Сигналы для рекомендаций: профиль одного пользователя и «популяция» (кто чем занимается) — каждый вид сигнала
 * одним запросом. Сами формулы оценки — в {@link EventScorer}.
 */
@Component
@RequiredArgsConstructor
class RecommendationSignals {

	/** Вес вида спорта, выбранного в профиле: не затухает. */
	static final double EXPLICIT_WEIGHT = 3.0;
	/** Вес посещённого занятия. */
	static final double ATTENDED_WEIGHT = 1.0;
	/** Вес проведённого мероприятия. */
	static final double HOSTED_WEIGHT = 1.0;
	/** Вес текущей записи (подтверждена, на рассмотрении или в листе ожидания). */
	static final double ACTIVE_REGISTRATION_WEIGHT = 0.8;
	/** Вес отклонённой заявки: человек хотел пойти. */
	static final double REJECTED_WEIGHT = 0.5;
	/** Вес своего сообщения в обсуждении. */
	static final double COMMENT_WEIGHT = 0.3;
	/** Вес отменённой записи. */
	static final double CANCELLED_WEIGHT = 0.2;
	/** Сколько истории смотреть, дней. */
	private static final int HISTORY_DAYS = 365;
	/** Сколько последних очных мест берём для «обычного места». */
	private static final int ORIGIN_POINTS = 10;

	private final RecommendationRepository signals;
	private final RecommendationDismissalRepository dismissals;
	/** Скрытые мероприятия: из них берутся образцы «такое не надо». */
	private final EventRepository events;
	private final UserSportRepository userSports;
	private final UserPreferencesRepository preferences;
	private final AppUserRepository users;
	private final OrganizationRepository organizations;
	private final SportRepository sports;
	private final RecommendationProperties properties;
	private final NotificationProperties notificationProperties;

	/**
	 * Скрытое мной мероприятие как образец «такое не надо»: вид спорта, организатор, местные день и время суток,
	 * место (null — онлайн) и вес — затухание по давности скрытия.
	 */
	record Dismissed(UUID sportId, UUID organizerKey, DayOfWeek day, Daytime daytime, Geo.Point place, double weight) {
	}

	/** Откуда точка отсчёта расстояния: от неё зависит текст причины. */
	enum OriginSource {
		/** Текущее место из запроса (геолокация браузера). */
		REQUEST,
		/** Домашняя точка из предпочтений. */
		HOME,
		/** Медиана мест, где человек обычно занимается. */
		HISTORY
	}

	/**
	 * Профиль пользователя для оценки.
	 *
	 * @param affinity        интерес к виду спорта p(u,s) в (0, 1], максимум = 1; пусто — холодный старт
	 * @param explicitSports  виды из профиля
	 * @param levels          уровень в конкретном виде (только заданные)
	 * @param generalLevel    общий уровень: из предпочтений, у новичка без данных — BEGINNER
	 * @param days            удобные дни; null — предпочтения не заполнены
	 * @param daytime         удобное время суток; null — не заполнено
	 * @param habit           посещения по ячейкам «день недели × время суток» (21 ячейка)
	 * @param habitTotal      всего посещений в гистограмме
	 * @param origin          точка отсчёта расстояния; null — неизвестна
	 * @param coParticipants  с кем занимался → сколько раз вместе
	 * @param coParticipantNames имена тех, с кем занимался
	 * @param organizerVisits ключ организатора → сколько раз я у него был
	 * @param dismissedEvents скрытые мной мероприятия
	 * @param sportDismissals вид спорта → затухающее число скрытий «Не мой вид спорта»
	 * @param dismissed       скрытые мной мероприятия как образцы «такое не надо» (для штрафа похожим)
	 * @param myStatus        мероприятие → статус моей записи
	 */
	record Profile(UUID userId, SystemRole role, String city, Map<UUID, Double> affinity, Set<UUID> explicitSports,
			Map<UUID, SportLevel> levels, SportLevel generalLevel, Set<DayOfWeek> days, Daytime daytime,
			int[] habit, int habitTotal, Geo.Point origin, OriginSource originSource, double radiusKm, ZoneId zone,
			Map<UUID, Integer> coParticipants, Map<UUID, String> coParticipantNames,
			Map<UUID, Integer> organizerVisits, Set<UUID> dismissedEvents, Map<UUID, Double> sportDismissals,
			List<Dismissed> dismissed, Map<UUID, RegistrationStatus> myStatus) {

		/** Нет ни интересов, ни истории: подборка строится без вида спорта. */
		boolean coldStart() {
			return affinity.isEmpty();
		}

		/** Уровень в виде спорта: заданный в профиле, иначе общий. */
		SportLevel levelIn(UUID sportId) {
			return levels.getOrDefault(sportId, generalLevel);
		}

		/** Интерес к виду спорта; 0 — никак не связан. */
		double affinity(UUID sportId) {
			return affinity.getOrDefault(sportId, 0.0);
		}
	}

	/**
	 * Все пользователи сразу: для похожести видов спорта и организаторов и для «кто уже записан».
	 * Похожести считаются лениво и запоминаются на время запроса.
	 */
	static final class Population {

		/** Сжатие похожести видов спорта: при 5 общих людях похожесть уменьшается вдвое. */
		private static final double SPORT_PRIOR = 5;
		/** Сжатие похожести организаторов. */
		private static final double ORGANIZER_PRIOR = 5;

		final Map<UUID, Sport> sportsById;
		final Map<UUID, Set<UUID>> eventParticipants;
		final Map<UUID, Long> hostedMeetings;
		private final Map<UUID, Set<UUID>> sportFans;
		/** Сколько разных людей вообще с чем-то связаны: база для ожидаемого случайного совпадения. */
		private final int population;
		private final Map<UUID, Set<UUID>> organizerAudience;
		private final Map<List<UUID>, Double> sportMemo = new HashMap<>();
		private final Map<List<UUID>, Double> organizerMemo = new HashMap<>();

		Population(Map<UUID, Sport> sportsById, Map<UUID, Set<UUID>> sportFans, Map<UUID, Set<UUID>> eventParticipants,
				Map<UUID, Set<UUID>> organizerAudience, Map<UUID, Long> hostedMeetings) {
			this.sportsById = sportsById;
			this.sportFans = sportFans;
			var everyone = new HashSet<UUID>();
			sportFans.values().forEach(everyone::addAll);
			this.population = everyone.size();
			this.eventParticipants = eventParticipants;
			this.organizerAudience = organizerAudience;
			this.hostedMeetings = hostedMeetings;
		}

		/**
		 * Похожесть видов спорта: косинус по множествам занимающихся за вычетом случайного совпадения.
		 * Если виды независимы, общих людей ожидается |A|·|B| / N; считаем только избыток:
		 * (|A∩B| − |A|·|B|/N) / √(|A|·|B|), затем сжатие на малом пересечении · n / (n + 5).
		 * Так два популярных вида не становятся «похожими» только потому, что их любят многие. Один и тот же вид — 1.
		 */
		double sportSimilarity(UUID a, UUID b) {
			if (a.equals(b)) {
				return 1;
			}
			return sportMemo.computeIfAbsent(key(a, b), k -> {
				var fansA = sportFans.getOrDefault(a, Set.of());
				var fansB = sportFans.getOrDefault(b, Set.of());
				int common = RecommendationMath.intersection(fansA, fansB);
				if (common == 0) {
					return 0.0;
				}
				double product = (double) fansA.size() * fansB.size();
				double excess = common - product / Math.max(population, 1);
				return excess <= 0 ? 0.0 : RecommendationMath.shrink(excess / Math.sqrt(product), common, SPORT_PRIOR);
			});
		}

		/** Похожесть организаторов: Жаккар их аудиторий, сжатый на малом пересечении. Один и тот же — 1. */
		double organizerSimilarity(UUID a, UUID b) {
			if (a.equals(b)) {
				return 1;
			}
			return organizerMemo.computeIfAbsent(key(a, b), k -> {
				var audienceA = organizerAudience.getOrDefault(a, Set.of());
				var audienceB = organizerAudience.getOrDefault(b, Set.of());
				int common = RecommendationMath.intersection(audienceA, audienceB);
				return common == 0 ? 0.0
						: RecommendationMath.shrink(RecommendationMath.jaccard(audienceA, audienceB), common, ORGANIZER_PRIOR);
			});
		}

		/** Подтверждённые участники мероприятия. */
		Set<UUID> participants(UUID eventId) {
			return eventParticipants.getOrDefault(eventId, Set.of());
		}

		/** Проведённые встречи организатора. */
		long hosted(UUID organizerKey) {
			return hostedMeetings.getOrDefault(organizerKey, 0L);
		}

		private static List<UUID> key(UUID a, UUID b) {
			return a.compareTo(b) < 0 ? List.of(a, b) : List.of(b, a);
		}
	}

	/** Все пользователи разом; на демо-объёме это пара тысяч строк. */
	Population population(Instant now) {
		var participations = signals.participations();
		var sportFans = new HashMap<UUID, Set<UUID>>();
		var eventParticipants = new HashMap<UUID, Set<UUID>>();
		var organizerAudience = new HashMap<UUID, Set<UUID>>();
		for (var p : participations) {
			sportFans.computeIfAbsent(p.sportId(), k -> new HashSet<>()).add(p.userId());
			eventParticipants.computeIfAbsent(p.eventId(), k -> new HashSet<>()).add(p.userId());
			organizerAudience.computeIfAbsent(p.organizerKey(), k -> new HashSet<>()).add(p.userId());
		}
		for (var pair : signals.userSportPairs()) {
			sportFans.computeIfAbsent(pair.sportId(), k -> new HashSet<>()).add(pair.userId());
		}
		var sportsById = sports.findAll().stream().collect(Collectors.toMap(Sport::getId, Function.identity()));
		return new Population(sportsById, sportFans, eventParticipants, organizerAudience, signals.hostedMeetings(now));
	}

	/** Профиль пользователя; lat/lon только парой (иначе 400). */
	Profile profile(UUID userId, RecommendationFilter filter, Instant now) {
		var requestLat = filter != null ? filter.lat() : null;
		var requestLon = filter != null ? filter.lon() : null;
		if ((requestLat == null) != (requestLon == null)) {
			throw new BadRequestException("Для подбора рядом укажите и широту, и долготу");
		}
		var user = users.findById(userId).orElseThrow();
		var prefs = preferences.findByUserId(userId).orElse(null);
		var mySports = userSports.findByUserId(userId);
		var registrations = signals.myRegistrations(userId);
		var attended = signals.myAttended(userId, now.minus(Duration.ofDays(HISTORY_DAYS)), now);
		var halfLife = Duration.ofDays(1).toMillis() * properties.halfLifeDays();

		// Сырой интерес r(u,s): явные виды не затухают, история затухает с периодом полураспада.
		var raw = new HashMap<UUID, Double>();
		var levels = new HashMap<UUID, SportLevel>();
		for (UserSport us : mySports) {
			raw.merge(us.getSportId(), EXPLICIT_WEIGHT, Double::sum);
			if (us.getLevel() != null) {
				levels.put(us.getSportId(), us.getLevel());
			}
		}
		var attendedEvents = new HashSet<UUID>();
		var organizerVisits = new HashMap<UUID, Integer>();
		for (var visit : attended) {
			attendedEvents.add(visit.eventId());
			raw.merge(visit.sportId(), ATTENDED_WEIGHT * decay(visit.startAt(), now, halfLife), Double::sum);
			organizerVisits.merge(visit.organizerKey(), 1, Integer::sum);
		}
		var myStatus = new HashMap<UUID, RegistrationStatus>();
		for (var registration : registrations) {
			myStatus.put(registration.eventId(), registration.status());
			if (attendedEvents.contains(registration.eventId())) {
				continue;
			}
			var weight = switch (registration.status()) {
				case CONFIRMED, PENDING, WAITLISTED -> ACTIVE_REGISTRATION_WEIGHT;
				case REJECTED -> REJECTED_WEIGHT;
				case CANCELLED -> CANCELLED_WEIGHT;
			};
			raw.merge(registration.sportId(), weight * decay(registration.createdAt(), now, halfLife), Double::sum);
		}
		for (var hosted : signals.myHosted(userId)) {
			raw.merge(hosted.sportId(), HOSTED_WEIGHT * decay(hosted.at(), now, halfLife), Double::sum);
		}
		for (var comment : signals.myComments(userId)) {
			raw.merge(comment.sportId(), COMMENT_WEIGHT * decay(comment.at(), now, halfLife), Double::sum);
		}
		var max = raw.values().stream().mapToDouble(Double::doubleValue).max().orElse(0);
		var affinity = new HashMap<UUID, Double>();
		if (max > 0) {
			raw.forEach((sportId, value) -> {
				if (value > 0) {
					affinity.put(sportId, value / max);
				}
			});
		}

		// Привычки: когда человек реально ходит (местное время занятия).
		var defaultZone = ZoneId.of(notificationProperties.timeZone());
		var habit = new int[21];
		for (var visit : attended) {
			var zone = visit.timeZone() != null ? ZoneId.of(visit.timeZone()) : Geo.zoneNear(visit.lat(), visit.lon(), defaultZone);
			var local = visit.startAt().atZone(zone);
			habit[habitCell(local.getDayOfWeek(), daytimeOf(local.getHour()))]++;
		}

		// Точка отсчёта: запрос → дом → медиана обычных мест.
		Geo.Point origin = null;
		OriginSource originSource = null;
		if (requestLat != null) {
			origin = new Geo.Point(requestLat, requestLon);
			originSource = OriginSource.REQUEST;
		} else if (prefs != null && prefs.getHomeLat() != null && prefs.getHomeLon() != null) {
			origin = new Geo.Point(prefs.getHomeLat(), prefs.getHomeLon());
			originSource = OriginSource.HOME;
		} else {
			var points = new ArrayList<Geo.Point>();
			attended.stream().filter(v -> v.format() == EventFormat.OFFLINE && v.lat() != null)
					.limit(ORIGIN_POINTS).forEach(v -> points.add(new Geo.Point(v.lat(), v.lon())));
			if (points.isEmpty()) {
				registrations.stream().filter(r -> r.format() == EventFormat.OFFLINE && r.lat() != null)
						.limit(ORIGIN_POINTS).forEach(r -> points.add(new Geo.Point(r.lat(), r.lon())));
			}
			origin = Geo.median(points);
			originSource = origin != null ? OriginSource.HISTORY : null;
		}
		var radius = filter != null && filter.radiusKm() != null ? filter.radiusKm()
				: prefs != null ? prefs.getRadiusKm() : properties.defaultRadiusKm();
		var zone = origin != null ? Geo.zoneNear(origin.lat(), origin.lon(), defaultZone) : defaultZone;

		var coParticipants = signals.coParticipants(userId, now);
		var coNames = users.findAllById(coParticipants.keySet()).stream()
				.collect(Collectors.toMap(AppUser::getId, RecommendationSignals::displayName));

		var dismissedEvents = new HashSet<UUID>();
		var sportDismissals = new HashMap<UUID, Double>();
		var myDismissals = dismissals.findByUserId(userId);
		var dismissedById = events.findAllById(myDismissals.stream().map(d -> d.getEventId()).toList()).stream()
				.collect(Collectors.toMap(Event::getId, e -> e));
		var dismissed = new ArrayList<Dismissed>();
		for (var dismissal : myDismissals) {
			dismissedEvents.add(dismissal.getEventId());
			var weight = decay(dismissal.getUpdatedAt(), now, halfLife);
			if (dismissal.getReason() == DismissReason.NOT_MY_SPORT) {
				sportDismissals.merge(dismissal.getSportId(), weight, Double::sum);
			}
			var event = dismissedById.get(dismissal.getEventId());
			if (event != null) {
				var eventZone = event.getTimeZone() != null ? ZoneId.of(event.getTimeZone())
						: Geo.zoneNear(event.getLat(), event.getLon(), defaultZone);
				var local = event.getStartAt().atZone(eventZone);
				dismissed.add(new Dismissed(event.getSportId(),
						event.getOrganizationId() != null ? event.getOrganizationId() : event.getAuthorId(),
						local.getDayOfWeek(), daytimeOf(local.getHour()),
						event.getLat() != null && event.getLon() != null ? new Geo.Point(event.getLat(), event.getLon()) : null,
						weight));
			}
		}

		var generalLevel = prefs != null ? prefs.getLevel()
				: affinity.isEmpty() ? SportLevel.BEGINNER : SportLevel.AMATEUR;
		return new Profile(userId, user.getSystemRole(), user.getCity(), affinity,
				mySports.stream().map(UserSport::getSportId).collect(Collectors.toSet()), levels, generalLevel,
				prefs != null && !prefs.getDays().isEmpty() ? EnumSet.copyOf(prefs.getDays()) : null,
				prefs != null ? prefs.getDaytime() : null, habit, attended.size(), origin, originSource, radius, zone,
				coParticipants, coNames, organizerVisits, dismissedEvents, sportDismissals, List.copyOf(dismissed), myStatus);
	}

	/** Подписи организаторов по ключам: название организации или имя человека. */
	Map<UUID, String> organizerNames(Collection<UUID> keys) {
		var result = new HashMap<UUID, String>();
		organizations.findAllById(keys).forEach((Organization org) -> result.put(org.getId(), org.getName()));
		users.findAllById(keys).forEach(user -> result.putIfAbsent(user.getId(), displayName(user)));
		return result;
	}

	/** Ячейка гистограммы привычек. */
	static int habitCell(DayOfWeek day, Daytime daytime) {
		return (day.getValue() - 1) * 3 + daytime.ordinal();
	}

	/** Время суток по местному часу: утро 5–11, день 12–16, остальное — вечер. */
	static Daytime daytimeOf(int hour) {
		if (hour >= 5 && hour < 12) {
			return Daytime.MORNING;
		}
		return hour >= 12 && hour < 17 ? Daytime.DAY : Daytime.EVENING;
	}

	/** Имя для причины: «Анна», иначе логин. */
	static String displayName(AppUser user) {
		return user.getFirstName() != null && !user.getFirstName().isBlank() ? user.getFirstName() : user.getUsername();
	}

	private static double decay(Instant at, Instant now, double halfLifeMillis) {
		return at == null ? 1 : RecommendationMath.decay(Duration.between(at, now).toMillis(), halfLifeMillis);
	}
}
