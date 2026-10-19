package com.hackathon.app.service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.config.RecommendationProperties;
import com.hackathon.app.domain.dto.RecommendationReason;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.Daytime;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.RecommendationFeatureCode;
import com.hackathon.app.domain.enums.RecommendationReasonCode;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.util.Geo;
import com.hackathon.app.util.RecommendationMath;
import com.hackathon.app.util.ScheduleDescriptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Оценка мероприятия для пользователя: признаки в [0, 1], взвешенная сумма по включённым признакам и множители
 * (уровень, скрытия). Без обращений к БД — всё нужное приходит в профиле, популяции и кандидате.
 * Формулы и обоснование — docs/recommendations.md.
 */
@Component
@RequiredArgsConstructor
class EventScorer {

	/* Константы формулы — в app.recommendations.scoring и app.recommendations.dismiss (application.yml). */
	private static final Locale RU = Locale.forLanguageTag("ru");

	private final RecommendationProperties properties;

	/**
	 * Мероприятие-кандидат с данными для оценки.
	 *
	 * @param occurrence    ближайшее подходящее занятие; null — занятий нет (тогда время не оценивается)
	 * @param count         разовое — подтверждённые записи, серия — отметки на занятие occurrence
	 * @param participants  подтверждённые участники (у серии — принятые в серию)
	 * @param organizerKey  организация, а у частного лица — автор
	 */
	record Candidate(Event event, Sport sport, EventOccurrence occurrence, long count, Set<UUID> participants,
			UUID organizerKey, String organizerName) {

		Instant startAt() {
			return occurrence != null ? occurrence.getStartAt() : event.getStartAt();
		}
	}

	/** Признак: значение, нормированный вес (0 — выключен) и вклад. */
	record Feature(RecommendationFeatureCode code, double value, double weight, double contribution) {
	}

	/**
	 * Оценка кандидата.
	 *
	 * @param base           взвешенная сумма признаков
	 * @param discoveryScore оценка без вида спорта — для слота «Попробуйте новое»
	 * @param newSport       вид спорта, с которым пользователь никак не связан
	 */
	record Scored(Candidate candidate, double score, double base, double levelGate, double dismissPenalty,
			double discoveryScore, boolean newSport, Double distanceKm, List<Feature> features,
			List<RecommendationReason> reasons) {

		/** Та же оценка с другим итоговым числом — для «похожих», где порядок задаёт похожесть. */
		Scored withScore(double value) {
			return new Scored(candidate, value, base, levelGate, dismissPenalty, discoveryScore, newSport, distanceKm,
					features, reasons);
		}
	}

	/** Сырой признак до нормировки весов; reason — текст причины или null. */
	private record Raw(RecommendationFeatureCode code, double value, double weight, RecommendationReason reason) {
	}

	Scored score(RecommendationSignals.Profile profile, RecommendationSignals.Population population, Candidate candidate,
			Instant now) {
		var weights = properties.weights();
		var event = candidate.event();
		var sportId = event.getSportId();
		var raws = new ArrayList<Raw>();

		// SPORT: max(p(u,s), 0.6 · max_t p(u,t)·sim(t,s)); при холодном старте выключен.
		if (!profile.coldStart()) {
			raws.add(sport(profile, population, candidate, weights.sport(), properties.scoring().relatedSportShare()));
		}

		// LEVEL и «ворота» за совсем неподходящий уровень.
		var userLevel = profile.levelIn(sportId);
		var levelValue = levelFit(userLevel, event.getLevel());
		raws.add(new Raw(RecommendationFeatureCode.LEVEL, levelValue, weights.level(), levelReason(userLevel, event.getLevel())));
		var levelGate = levelValue < 0.1 ? properties.scoring().levelGate() : 1;

		// DISTANCE: гауссово ядро с половиной на радиусе; без точки отсчёта выключен.
		Double distanceKm = null;
		if (profile.origin() != null) {
			if (event.getFormat() == EventFormat.ONLINE) {
				raws.add(new Raw(RecommendationFeatureCode.DISTANCE, properties.scoring().onlineDistanceValue(), weights.distance(),
						reason(RecommendationReasonCode.ONLINE, "Онлайн — можно присоединиться из дома")));
			} else if (event.getLat() != null && event.getLon() != null) {
				distanceKm = Geo.distanceKm(profile.origin(), new Geo.Point(event.getLat(), event.getLon()));
				var value = RecommendationMath.gaussian(distanceKm, profile.radiusKm());
				raws.add(new Raw(RecommendationFeatureCode.DISTANCE, value, weights.distance(),
						distanceKm <= profile.radiusKm() ? reason(RecommendationReasonCode.NEARBY,
								formatDistance(distanceKm) + " " + originLabel(profile.originSource())) : null));
			}
		} else if (event.getFormat() == EventFormat.ONLINE) {
			// без точки отсчёта онлайн не получает признак, но причина полезна
			raws.add(new Raw(RecommendationFeatureCode.DISTANCE, 0, 0,
					reason(RecommendationReasonCode.ONLINE, "Онлайн — можно присоединиться из дома")));
		}

		// TIME: предпочтения и привычки по местному времени занятия.
		var time = time(profile, candidate);
		if (time != null) {
			raws.add(new Raw(RecommendationFeatureCode.TIME, time.value(), weights.time(), time.reason()));
		}

		// SOCIAL: F = Σ w(u,v) по знакомым участникам, 1 − e^(−F/2).
		if (!profile.coParticipants().isEmpty()) {
			raws.add(social(profile, candidate, weights.social()));
		}

		// ORGANIZER: лояльность к организатору или к похожему (общая аудитория).
		if (!profile.organizerVisits().isEmpty()) {
			raws.add(organizer(profile, population, candidate, weights.organizer(), properties.scoring().relatedOrganizerShare()));
		}

		// TRUST: h / (h + 5), у организации +0.1.
		var hosted = population.hosted(candidate.organizerKey());
		var trust = RecommendationMath.clamp01((double) hosted / (hosted + 5) + (event.getOrganizationId() != null ? 0.1 : 0));
		raws.add(new Raw(RecommendationFeatureCode.TRUST, trust, weights.trust(), hosted >= 5
				? reason(RecommendationReasonCode.TRUSTED_ORGANIZER, "Организатор провёл " + hosted + " "
						+ ScheduleDescriptions.plural((int) hosted, "встречу", "встречи", "встреч"))
				: null));

		// POPULARITY: 1 − e^(−n/6).
		var count = candidate.count();
		raws.add(new Raw(RecommendationFeatureCode.POPULARITY, RecommendationMath.saturate(count, 6), weights.popularity(),
				count >= 5 ? reason(RecommendationReasonCode.POPULAR, (event.isRecurring() ? "Уже отметились " : "Уже записались ")
						+ count + " " + ScheduleDescriptions.plural((int) count, "человек", "человека", "человек")) : null));

		// QUORUM: не хватает 1–3 человек — помогаем встрече состояться.
		var need = event.getMinParticipants() != null ? event.getMinParticipants() - count : 0;
		raws.add(new Raw(RecommendationFeatureCode.QUORUM, need >= 1 && need <= 3 ? 1 : 0, weights.quorum(),
				need >= 1 && need <= 3 ? reason(RecommendationReasonCode.NEEDS_PEOPLE, "Не хватает " + need + " "
						+ ScheduleDescriptions.plural((int) need, "человека", "человек", "человек")
						+ " — встреча состоится с вами") : null));

		// URGENCY: лучше всего через 6–72 часа.
		var hours = Duration.between(now, candidate.startAt()).toMinutes() / 60.0;
		var soon = reason(RecommendationReasonCode.SOON, untilText(hours));
		raws.add(new Raw(RecommendationFeatureCode.URGENCY, urgency(hours), weights.urgency(), hours <= 48 ? soon : null));

		var base = weighted(raws, null);
		var penalty = dismissPenalty(profile, population, candidate);
		var discovery = weighted(raws, RecommendationFeatureCode.SPORT) * levelGate * penalty;
		var features = features(raws);
		return new Scored(candidate, base * levelGate * penalty, base, levelGate, penalty, discovery,
				!profile.coldStart() && profile.affinity(sportId) == 0, distanceKm, features,
				reasons(raws, features, soon, properties.scoring()));
	}

	/**
	 * Штраф за «Не интересно»: sportFactor^k за скрытия «Не мой вид спорта» этого вида и Π(1 − strength · sim · decay)
	 * по похожим скрытым событиям. Не ниже floor: похожие встречи уходят вниз, но не исчезают из подборки совсем.
	 */
	double dismissPenalty(RecommendationSignals.Profile profile, RecommendationSignals.Population population,
			Candidate candidate) {
		var dismiss = properties.dismiss();
		var penalty = Math.pow(dismiss.sportFactor(), profile.sportDismissals().getOrDefault(candidate.event().getSportId(), 0.0));
		for (var sample : profile.dismissed()) {
			var sim = similarity(sample, population, candidate, profile.zone());
			if (sim >= dismiss.minSimilarity()) {
				penalty *= 1 - RecommendationMath.clamp01(dismiss.similarStrength() * sim * sample.weight());
			}
		}
		return Math.max(dismiss.floor(), penalty);
	}

	/** Похожесть кандидата на скрытое событие в [0, 1]: вид спорта, организатор, день и время, место. */
	private double similarity(RecommendationSignals.Dismissed sample, RecommendationSignals.Population population,
			Candidate candidate, ZoneId fallbackZone) {
		var w = properties.dismiss().similarity();
		var event = candidate.event();
		var sport = sample.sportId().equals(event.getSportId()) ? 1
				: population.sportSimilarity(sample.sportId(), event.getSportId());
		var organizer = sample.organizerKey().equals(candidate.organizerKey()) ? 1 : 0;
		var local = candidate.startAt().atZone(zoneOf(event, fallbackZone));
		var time = local.getDayOfWeek() == sample.day()
				&& RecommendationSignals.daytimeOf(local.getHour()) == sample.daytime() ? 1 : 0;
		double place = 0;
		if (sample.place() != null && event.getLat() != null && event.getLon() != null) {
			place = Geo.distanceKm(sample.place(), new Geo.Point(event.getLat(), event.getLon()))
					<= properties.dismiss().nearKm() ? 1 : 0;
		}
		var total = w.sport() + w.organizer() + w.time() + w.place();
		return total == 0 ? 0 : (w.sport() * sport + w.organizer() * organizer + w.time() * time + w.place() * place) / total;
	}

	/** Уровень пользователя → уровень мероприятия: «Любой» 0.85, совпал 1, проще 0.6, сложнее 0.4, через ступень 0.05. */
	static double levelFit(SportLevel user, EventLevel event) {
		if (event == EventLevel.ANY) {
			return 0.85;
		}
		int diff = event.ordinal() - EventLevel.BEGINNER.ordinal() - user.ordinal();
		return switch (diff) {
			case 0 -> 1;
			case -1 -> 0.6;
			case 1 -> 0.4;
			default -> 0.05;
		};
	}

	/** Близость начала: 6–72 ч — 1; 2–6 ч — от 0.3 до 1; раньше — 0.3; дальше — e^(−(t−72)/168). */
	static double urgency(double hours) {
		if (hours < 2) {
			return 0.3;
		}
		if (hours < 6) {
			return 0.3 + 0.7 * (hours - 2) / 4;
		}
		return hours <= 72 ? 1 : Math.exp(-(hours - 72) / 168);
	}

	private Raw sport(RecommendationSignals.Profile profile, RecommendationSignals.Population population,
			Candidate candidate, double weight, double relatedShare) {
		var sportId = candidate.event().getSportId();
		var direct = profile.affinity(sportId);
		double related = 0;
		UUID relatedTo = null;
		for (Map.Entry<UUID, Double> entry : profile.affinity().entrySet()) {
			if (entry.getKey().equals(sportId)) {
				continue;
			}
			var value = relatedShare * entry.getValue() * population.sportSimilarity(entry.getKey(), sportId);
			if (value > related) {
				related = value;
				relatedTo = entry.getKey();
			}
		}
		RecommendationReason reason = null;
		if (direct > 0 && direct >= related) {
			reason = reason(RecommendationReasonCode.YOUR_SPORT, (profile.explicitSports().contains(sportId)
					? "Вы занимаетесь: " : "Вы часто выбираете: ") + lower(candidate.sport()));
		} else if (related > 0) {
			var similar = population.sportsById.get(relatedTo);
			reason = reason(RecommendationReasonCode.RELATED_SPORT, "Похоже на ваш интерес: " + lower(similar));
		}
		return new Raw(RecommendationFeatureCode.SPORT, Math.max(direct, related), weight, reason);
	}

	private static RecommendationReason levelReason(SportLevel user, EventLevel event) {
		// у «Любого уровня» причина не пишется: иначе «Подходит новичкам» было бы почти у каждой карточки
		if (user == SportLevel.BEGINNER && event == EventLevel.BEGINNER) {
			return reason(RecommendationReasonCode.BEGINNER_FRIENDLY, "Подходит новичкам");
		}
		if (event != EventLevel.ANY && event.name().equals(user.name())) {
			return reason(RecommendationReasonCode.LEVEL_FIT, "Уровень «" + levelLabel(user) + "» — как у вас");
		}
		return null;
	}

	private record Time(double value, RecommendationReason reason) {
	}

	/** pref = 0.6·[день удобен] + 0.4·[время суток] (соседнее — 0.5); привычка — сглаженная гистограмма. */
	private Time time(RecommendationSignals.Profile profile, Candidate candidate) {
		if (candidate.occurrence() == null) {
			return null;
		}
		var local = candidate.startAt().atZone(zoneOf(candidate.event(), profile.zone()));
		var day = local.getDayOfWeek();
		var daytime = RecommendationSignals.daytimeOf(local.getHour());
		Double pref = null;
		if (profile.days() != null) {
			var dayMatch = profile.days().contains(day) ? 1 : 0;
			var daytimeMatch = profile.daytime() == null ? 0.5 : daytime == profile.daytime() ? 1
					: Math.abs(daytime.ordinal() - profile.daytime().ordinal()) == 1 ? 0.5 : 0;
			pref = 0.6 * dayMatch + 0.4 * daytimeMatch;
		}
		Double habit = null;
		if (profile.habitTotal() >= properties.scoring().minHabit()) {
			int max = 0;
			for (int cell : profile.habit()) {
				max = Math.max(max, cell);
			}
			// Лаплас: (n + 1) / (N + 21), нормировано на самую частую ячейку.
			habit = (profile.habit()[RecommendationSignals.habitCell(day, daytime)] + 1.0) / (max + 1.0);
		}
		if (pref == null && habit == null) {
			return null;
		}
		var value = pref != null && habit != null ? 0.5 * pref + 0.5 * habit : pref != null ? pref : habit;
		RecommendationReason reason = null;
		if (value >= 0.7) {
			var when = capitalize(dayLabel(day) + " " + daytimeLabel(daytime));
			reason = reason(RecommendationReasonCode.GOOD_TIME, habit != null && (pref == null || habit > pref)
					? when + " — в это время вы обычно занимаетесь" : when + " — удобное вам время");
		}
		return new Time(value, reason);
	}

	private static Raw social(RecommendationSignals.Profile profile, Candidate candidate, double weight) {
		double together = 0;
		UUID best = null;
		int bestCount = 0;
		int friends = 0;
		for (var userId : candidate.participants()) {
			var count = profile.coParticipants().getOrDefault(userId, 0);
			if (count > 0) {
				together += count;
				friends++;
				if (count > bestCount) {
					bestCount = count;
					best = userId;
				}
			}
		}
		RecommendationReason reason = null;
		if (best != null) {
			var name = profile.coParticipantNames().getOrDefault(best, "знакомый");
			reason = reason(RecommendationReasonCode.FRIENDS_GOING, friends == 1
					? "Идёт " + name + " — вы уже занимались вместе"
					: "Идут " + name + " и ещё " + (friends - 1) + ", с кем вы уже занимались");
		}
		return new Raw(RecommendationFeatureCode.SOCIAL, RecommendationMath.saturate(together, 2), weight, reason);
	}

	private static Raw organizer(RecommendationSignals.Profile profile, RecommendationSignals.Population population,
			Candidate candidate, double weight, double relatedShare) {
		var key = candidate.organizerKey();
		var direct = RecommendationMath.saturate(profile.organizerVisits().getOrDefault(key, 0), 2);
		double related = 0;
		for (var entry : profile.organizerVisits().entrySet()) {
			if (entry.getKey().equals(key)) {
				continue;
			}
			var value = relatedShare * RecommendationMath.saturate(entry.getValue(), 2)
					* population.organizerSimilarity(entry.getKey(), key);
			related = Math.max(related, value);
		}
		RecommendationReason reason = null;
		if (direct > 0 && direct >= related) {
			reason = reason(RecommendationReasonCode.KNOWN_ORGANIZER, "Вы уже были у организатора: " + candidate.organizerName());
		} else if (related > 0) {
			reason = reason(RecommendationReasonCode.KNOWN_ORGANIZER, "Сюда ходят те же люди, что и на ваши встречи");
		}
		return new Raw(RecommendationFeatureCode.ORGANIZER, Math.max(direct, related), weight, reason);
	}

	/** Σ wᵢ·fᵢ / Σ wᵢ по включённым признакам (weight > 0), кроме without. */
	private static double weighted(List<Raw> raws, RecommendationFeatureCode without) {
		double sum = 0;
		double total = 0;
		for (var raw : raws) {
			if (raw.code() != without && raw.weight() > 0) {
				sum += raw.weight() * raw.value();
				total += raw.weight();
			}
		}
		return total == 0 ? 0 : sum / total;
	}

	/** Признаки в порядке enum; выключенные — с весом 0. */
	private static List<Feature> features(List<Raw> raws) {
		double total = raws.stream().mapToDouble(Raw::weight).sum();
		var byCode = new EnumMap<RecommendationFeatureCode, Feature>(RecommendationFeatureCode.class);
		for (var raw : raws) {
			var weight = total == 0 ? 0 : raw.weight() / total;
			byCode.put(raw.code(), new Feature(raw.code(), raw.value(), weight, weight * raw.value()));
		}
		for (var code : List.of(RecommendationFeatureCode.SPORT, RecommendationFeatureCode.LEVEL,
				RecommendationFeatureCode.DISTANCE, RecommendationFeatureCode.TIME, RecommendationFeatureCode.SOCIAL,
				RecommendationFeatureCode.ORGANIZER, RecommendationFeatureCode.TRUST, RecommendationFeatureCode.POPULARITY,
				RecommendationFeatureCode.QUORUM, RecommendationFeatureCode.URGENCY)) {
			byCode.putIfAbsent(code, new Feature(code, 0, 0, 0));
		}
		return List.copyOf(byCode.values());
	}

	/**
	 * 1–3 причины с наибольшим вкладом, не меньше порога; онлайн-причина без признака идёт со своим «вкладом» 0.04.
	 * Если ни одна не прошла — «через сколько начнётся».
	 */
	private static List<RecommendationReason> reasons(List<Raw> raws, List<Feature> features,
			RecommendationReason fallback, RecommendationProperties.Scoring scoring) {
		var contributionByCode = new EnumMap<RecommendationFeatureCode, Double>(RecommendationFeatureCode.class);
		features.forEach(f -> contributionByCode.put(f.code(), f.contribution()));
		record Ranked(RecommendationReason reason, double contribution) {
		}
		var ranked = new ArrayList<Ranked>();
		for (var raw : raws) {
			if (raw.reason() == null) {
				continue;
			}
			var contribution = raw.weight() == 0 ? 0.04 : contributionByCode.get(raw.code());
			if (contribution >= scoring.reasonThreshold()) {
				ranked.add(new Ranked(raw.reason(), contribution));
			}
		}
		ranked.sort(Comparator.comparingDouble(Ranked::contribution).reversed());
		var result = ranked.stream().limit(scoring.maxReasons()).map(Ranked::reason).toList();
		return result.isEmpty() ? List.of(fallback) : result;
	}

	/** Пояс занятия: серия — свой, разовое — ближайшего крупного города, онлайн — пояс пользователя. */
	static ZoneId zoneOf(Event event, ZoneId fallback) {
		if (event.getTimeZone() != null) {
			return ZoneId.of(event.getTimeZone());
		}
		return Geo.zoneNear(event.getLat(), event.getLon(), fallback);
	}

	static RecommendationReason reason(RecommendationReasonCode code, String text) {
		return new RecommendationReason(code, text);
	}

	static String formatDistance(double km) {
		return km < 1 ? Math.max(50, Math.round(km * 20) * 50) + " м" : String.format(RU, "%.1f км", km);
	}

	static String originLabel(RecommendationSignals.OriginSource source) {
		return switch (source) {
			case REQUEST -> "от вас";
			case HOME -> "от дома";
			case HISTORY -> "от мест, где вы обычно занимаетесь";
		};
	}

	private static String untilText(double hours) {
		if (hours < 1) {
			return "Начнётся меньше чем через час";
		}
		if (hours < 24) {
			int h = (int) Math.round(hours);
			return "Начнётся через " + h + " " + ScheduleDescriptions.plural(h, "час", "часа", "часов");
		}
		int days = (int) Math.round(hours / 24);
		return "Начнётся через " + days + " " + ScheduleDescriptions.plural(days, "день", "дня", "дней");
	}

	static String levelLabel(SportLevel level) {
		return switch (level) {
			case BEGINNER -> "Новичок";
			case AMATEUR -> "Любитель";
			case PRO -> "Профи";
		};
	}

	private static String dayLabel(DayOfWeek day) {
		return switch (day) {
			case MONDAY -> "в понедельник";
			case TUESDAY -> "во вторник";
			case WEDNESDAY -> "в среду";
			case THURSDAY -> "в четверг";
			case FRIDAY -> "в пятницу";
			case SATURDAY -> "в субботу";
			case SUNDAY -> "в воскресенье";
		};
	}

	private static String daytimeLabel(Daytime daytime) {
		return switch (daytime) {
			case MORNING -> "утром";
			case DAY -> "днём";
			case EVENING -> "вечером";
		};
	}

	static String lower(Sport sport) {
		return sport == null ? "вид спорта" : sport.getName().toLowerCase(RU);
	}

	private static String capitalize(String text) {
		return text.isEmpty() ? text : Character.toUpperCase(text.charAt(0)) + text.substring(1);
	}
}
