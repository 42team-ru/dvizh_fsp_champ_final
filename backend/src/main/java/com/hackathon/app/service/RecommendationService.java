package com.hackathon.app.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.config.RecommendationProperties;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.RecommendationExplainResponse;
import com.hackathon.app.domain.dto.RecommendationFilter;
import com.hackathon.app.domain.dto.RecommendationReason;
import com.hackathon.app.domain.dto.RecommendedEventResponse;
import com.hackathon.app.domain.dto.RecommendedOrganizationResponse;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.OrganizationSport;
import com.hackathon.app.domain.enums.DismissReason;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.RecommendationReasonCode;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.mapper.OrganizationMapper;
import com.hackathon.app.domain.mapper.RecommendationMapper;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventFeedRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.EventSpecifications;
import com.hackathon.app.repository.OccurrenceAttendanceRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.OrganizationSportRepository;
import com.hackathon.app.repository.RecommendationDismissalRepository;
import com.hackathon.app.repository.RecommendationRepository;
import com.hackathon.app.util.Geo;
import com.hackathon.app.util.RecommendationMath;
import com.hackathon.app.util.ScheduleDescriptions;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Персональная подборка мероприятий и клубов, «Не интересно» и «Похожие встречи». Сигналы собирает
 * {@link RecommendationSignals}, оценивает {@link EventScorer}, порядок с разнообразием — {@link DiversityRanker}.
 * Всё считается на лету по текущим данным; формулы — docs/recommendations.md.
 */
@Service
@RequiredArgsConstructor
public class RecommendationService {

	private static final int DEFAULT_SIZE = 20;
	/** «Похожие»: другой вид спорта допускается, если похожесть видов не меньше. */
	private static final double SIMILAR_SPORT_MIN = 0.3;
	/** Веса признаков клуба. */
	private static final double ORG_SPORT = 0.40;
	private static final double ORG_DISTANCE = 0.20;
	private static final double ORG_TRUST = 0.15;
	private static final double ORG_ACTIVITY = 0.15;
	private static final double ORG_BEGINNER = 0.10;
	/** Клуб, где я был столько раз, уже «свой»: показываем ниже. */
	private static final int ORG_LOYAL_VISITS = 3;
	private static final Set<RegistrationStatus> ACTIVE = EnumSet.of(RegistrationStatus.CONFIRMED,
			RegistrationStatus.PENDING, RegistrationStatus.WAITLISTED);

	private final RecommendationSignals signals;
	private final EventScorer scorer;
	private final RecommendationProperties properties;
	private final RecommendationRepository recommendationQueries;
	private final RecommendationDismissalRepository dismissals;
	private final RecommendationMapper mapper;
	private final EventRepository events;
	private final EventFeedRepository feed;
	private final EventOccurrenceRepository occurrences;
	private final OccurrenceAttendanceRepository attendances;
	private final EventService eventService;
	private final EventAccessPolicy policy;
	private final OrganizationRepository organizations;
	private final OrganizationSportRepository organizationSports;
	private final OrganizationAwardService awards;
	private final OrganizationMapper organizationMapper;
	private final SportMapper sportMapper;
	private final AppUserRepository users;
	private final DbTimeRepository dbTime;

	/** Всё, что нужно для решения «показывать ли». */
	private record Context(RecommendationSignals.Profile profile, RecommendationSignals.Population population,
			Set<UUID> coOrganized, Instant now) {
	}

	/**
	 * Подборка «Вам подойдёт»: опубликованные мероприятия с занятием в горизонте, лучшие сверху, с разнообразием.
	 * Аккаунтам организаций и админу — пусто: они не записываются на мероприятия.
	 */
	@Transactional(readOnly = true)
	public PageResponse<RecommendedEventResponse> events(UUID userId, RecommendationFilter filter) {
		var now = dbTime.now();
		var profile = signals.profile(userId, filter, now);
		int size = filter.size() != null ? filter.size() : DEFAULT_SIZE;
		int page = filter.page() != null ? filter.page() : 0;
		var earliest = now.plus(Duration.ofMinutes(properties.minLeadMinutes()));
		var from = filter.from() != null && filter.from().isAfter(earliest) ? filter.from() : earliest;
		var to = filter.to() != null ? filter.to() : now.plus(Duration.ofDays(properties.horizonDays()));
		if (profile.role() != SystemRole.USER || to.isBefore(from)) {
			return PageResponse.slice(List.of(), page, size, 0);
		}
		var population = signals.population(now);
		var context = new Context(profile, population, Set.copyOf(recommendationQueries.myCoOrganized(userId)), now);
		var spec = EventSpecifications.feed(null, filter.sportId(), null, null, null, null, null, null);
		var ids = feed.findIds(spec, from, to, properties.maxCandidates());
		var eligible = candidates(EventListLookups.sortedLike(events.findAllById(ids), ids), population, from, to)
				.stream()
				.map(candidate -> scorer.score(profile, population, candidate, now))
				.filter(scored -> excludedReason(context, scored) == null)
				.toList();
		var ranked = DiversityRanker.rank(eligible, (page + 1) * size, properties.mmrLambda(),
				profile.coldStart() ? 0 : properties.discoveryEvery(), DiversityRanker.feedSimilarity(profile.zone()));
		var pageItems = ranked.stream().skip((long) page * size).toList();
		var summaries = byId(eventService.summaries(pageItems.stream().map(r -> r.scored().candidate().event()).toList(),
				userId, from, to));
		var items = pageItems.stream()
				.map(r -> mapper.toEvent(summaries.get(r.scored().candidate().event().getId()), r.scored().score(),
						r.scored().distanceKm(), r.discovery() ? discoveryReasons(r.scored()) : r.scored().reasons(),
						r.discovery()))
				.toList();
		return PageResponse.slice(items, page, size, eligible.size());
	}

	/** Разбор оценки одного мероприятия: признаки, веса, множители и попадёт ли оно в подборку. */
	@Transactional(readOnly = true)
	public RecommendationExplainResponse explain(UUID userId, UUID eventId, RecommendationFilter filter) {
		var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
		var now = dbTime.now();
		var profile = signals.profile(userId, filter, now);
		var population = signals.population(now);
		var context = new Context(profile, population, Set.copyOf(recommendationQueries.myCoOrganized(userId)), now);
		var from = now.plus(Duration.ofMinutes(properties.minLeadMinutes()));
		var candidate = candidates(List.of(event), population, from, OccurrenceService.FAR_FUTURE).getFirst();
		var scored = scorer.score(profile, population, candidate, now);
		var excluded = excludedReason(context, scored);
		if (excluded == null && policy.isOrganizationSuspended(event)) {
			excluded = "Организация мероприятия сейчас не допущена";
		}
		if (excluded == null && candidate.startAt().isAfter(now.plus(Duration.ofDays(properties.horizonDays())))) {
			excluded = "Ближайшее занятие позже чем через " + properties.horizonDays() + " дней";
		}
		var features = scored.features().stream()
				.map(f -> mapper.toFeature(f.code(), f.value(), f.weight(), f.contribution()))
				.toList();
		return mapper.toExplain(eventId, scored.score(), scored.base(), scored.levelGate(), scored.dismissPenalty(),
				excluded == null, excluded, scored.distanceKm(), features, scored.reasons());
	}

	/**
	 * «Не интересно»: мероприятие больше не попадает в подборку; NOT_MY_SPORT ещё и вдвое снижает оценку этого
	 * вида спорта (с затуханием). Повтор обновляет причину. Пользователь заблокирован — двойной клик не создаст дубль.
	 */
	@Transactional
	public void dismiss(UUID userId, UUID eventId, DismissReason reason) {
		var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
		users.findByIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		var existing = dismissals.findByUserIdAndEventId(userId, eventId);
		if (existing.isPresent()) {
			mapper.updateReason(existing.get(), reason);
		} else {
			dismissals.save(mapper.toDismissal(userId, eventId, event.getSportId(), reason));
		}
	}

	/** Вернуть скрытое; если не скрывали — ничего не происходит. */
	@Transactional
	public void undismiss(UUID userId, UUID eventId) {
		if (!events.existsById(eventId)) {
			throw new NoSuchElementException(EventService.NOT_FOUND);
		}
		dismissals.findByUserIdAndEventId(userId, eventId).ifPresent(dismissals::delete);
	}

	/**
	 * Похожие встречи (когда мест нет или заявку отклонили): похожесть на исходное мероприятие по виду спорта,
	 * уровню, месту, времени и составу участников; при известном профиле — с поправкой на личную оценку.
	 * Кроме этой, моих (я организатор или записан) и полных.
	 */
	@Transactional(readOnly = true)
	public List<EventSummaryResponse> similar(UUID eventId, UUID userId, int limit) {
		var source = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
		var now = dbTime.now();
		int size = Math.clamp(limit, 1, 20);
		var profile = signals.profile(userId, null, now);
		var population = signals.population(now);
		var coOrganized = Set.copyOf(recommendationQueries.myCoOrganized(userId));
		// тот же вид — отдельно, чтобы он не потерялся среди ближайших других видов
		var ids = new LinkedHashSet<>(feed.findIds(EventSpecifications.feed(null, source.getSportId(), null, null, null,
				null, null, null), now, null, properties.maxCandidates()));
		ids.addAll(feed.findIds(EventSpecifications.feed(null, null, null, null, null, null, null, null), now, null,
				properties.maxCandidates()));
		var idList = List.copyOf(ids);
		var sourceCandidate = candidates(List.of(source), population, now, OccurrenceService.FAR_FUTURE).getFirst();
		boolean personal = !profile.coldStart() && profile.role() == SystemRole.USER;
		var scoredList = new ArrayList<EventScorer.Scored>();
		for (var candidate : candidates(EventListLookups.sortedLike(events.findAllById(idList), idList), population, now,
				OccurrenceService.FAR_FUTURE)) {
			var event = candidate.event();
			var status = profile.myStatus().get(event.getId());
			if (event.getId().equals(eventId) || event.getAuthorId().equals(userId) || coOrganized.contains(event.getId())
					|| (status != null && status != RegistrationStatus.CANCELLED) || isFullSingle(candidate)) {
				continue;
			}
			var sportSimilarity = population.sportSimilarity(source.getSportId(), event.getSportId());
			if (sportSimilarity < SIMILAR_SPORT_MIN) {
				continue;
			}
			var scored = scorer.score(profile, population, candidate, now);
			var similarity = itemSimilarity(sourceCandidate, candidate, sportSimilarity, profile);
			scoredList.add(scored.withScore(personal ? similarity * (0.7 + 0.3 * scored.score()) : similarity));
		}
		var ranked = DiversityRanker.rank(scoredList, size, properties.mmrLambda(), 0,
				DiversityRanker.feedSimilarity(profile.zone()));
		return eventService.summaries(ranked.stream().map(r -> r.scored().candidate().event()).toList(), userId);
	}

	/**
	 * Клубы для вас: одобренные организации с встречами в ближайшие 30 дней. Оценка — по моим видам спорта
	 * (с похожими), расстоянию до их встреч (или городу), надёжности, активности и, для новичка, доле
	 * встреч «для всех». Клуб, где я был 3+ раза, — ниже: он уже «свой».
	 */
	@Transactional(readOnly = true)
	public List<RecommendedOrganizationResponse> organizations(UUID userId, Double lat, Double lon, int limit) {
		var now = dbTime.now();
		var profile = signals.profile(userId, new RecommendationFilter(lat, lon, null, null, null, null, null, null), now);
		var population = signals.population(now);
		var horizon = now.plus(Duration.ofDays(properties.horizonDays()));
		var ids = feed.findIds(EventSpecifications.feed(null, null, null, null, null, null, null, null), now, horizon,
				properties.maxCandidates());
		var upcomingByOrg = events.findAllById(ids).stream().filter(e -> e.getOrganizationId() != null)
				.collect(Collectors.groupingBy(Event::getOrganizationId));
		var candidates = organizations.findByStatus(OrganizationStatus.APPROVED).stream()
				.filter(org -> !org.getAccountId().equals(userId) && upcomingByOrg.containsKey(org.getId()))
				.toList();
		var sportsByOrg = organizationSports.findByOrganizationIdIn(candidates.stream().map(Organization::getId).toList())
				.stream().collect(Collectors.groupingBy(OrganizationSport::getOrganizationId,
						Collectors.mapping(OrganizationSport::getSportId, Collectors.toCollection(LinkedHashSet::new))));
		var featured = awards.featured();
		var featuredId = featured != null ? featured.id() : null;

		record Ranked(Organization org, double score, Double distanceKm, List<RecommendationReason> reasons,
				Set<UUID> sports, long upcoming, long hosted) {
		}
		var ranked = new ArrayList<Ranked>();
		for (var org : candidates) {
			var upcoming = upcomingByOrg.get(org.getId());
			var sports = new LinkedHashSet<>(sportsByOrg.getOrDefault(org.getId(), new LinkedHashSet<>()));
			upcoming.forEach(e -> sports.add(e.getSportId()));
			var parts = new ArrayList<Part>();

			if (!profile.coldStart()) {
				parts.add(organizationSport(profile, population, sports));
			}
			Double distanceKm = null;
			if (profile.origin() != null) {
				var nearest = upcoming.stream()
						.filter(e -> e.getFormat() == EventFormat.OFFLINE && e.getLat() != null && e.getLon() != null)
						.mapToDouble(e -> Geo.distanceKm(profile.origin(), new Geo.Point(e.getLat(), e.getLon())))
						.min();
				distanceKm = nearest.isPresent() ? nearest.getAsDouble() : null;
				if (distanceKm != null) {
					parts.add(new Part(RecommendationMath.gaussian(distanceKm, profile.radiusKm()), ORG_DISTANCE,
							distanceKm <= profile.radiusKm() ? EventScorer.reason(RecommendationReasonCode.NEARBY,
									"Встречи в " + EventScorer.formatDistance(distanceKm) + " "
											+ EventScorer.originLabel(profile.originSource())) : null));
				}
			} else if (profile.city() != null && org.getCity() != null) {
				var same = profile.city().trim().equalsIgnoreCase(org.getCity().trim());
				parts.add(new Part(same ? 1 : 0, ORG_DISTANCE,
						same ? EventScorer.reason(RecommendationReasonCode.SAME_CITY, "В вашем городе") : null));
			}
			var hosted = population.hosted(org.getId());
			var awarded = org.getId().equals(featuredId);
			parts.add(new Part(RecommendationMath.clamp01((double) hosted / (hosted + 5) + (awarded ? 0.2 : 0)), ORG_TRUST,
					awarded ? EventScorer.reason(RecommendationReasonCode.AWARDED, "Организация месяца")
							: hosted >= 5 ? EventScorer.reason(RecommendationReasonCode.TRUSTED_ORGANIZER, "Провёл "
									+ hosted + " " + ScheduleDescriptions.plural((int) hosted, "встречу", "встречи", "встреч"))
							: null));
			int count = upcoming.size();
			var activeReason = EventScorer.reason(RecommendationReasonCode.ACTIVE, count + " "
					+ ScheduleDescriptions.plural(count, "встреча", "встречи", "встреч") + " в ближайший месяц");
			parts.add(new Part(RecommendationMath.saturate(count, 3), ORG_ACTIVITY, count >= 3 ? activeReason : null));
			if (profile.generalLevel() == SportLevel.BEGINNER) {
				var share = (double) upcoming.stream()
						.filter(e -> e.getLevel() == EventLevel.ANY || e.getLevel() == EventLevel.BEGINNER).count() / count;
				parts.add(new Part(share, ORG_BEGINNER, share >= 0.5
						? EventScorer.reason(RecommendationReasonCode.BEGINNER_FRIENDLY, "Много встреч для новичков") : null));
			}
			var total = parts.stream().mapToDouble(Part::weight).sum();
			var score = parts.stream().mapToDouble(p -> p.weight() * p.value()).sum() / total;
			if (profile.organizerVisits().getOrDefault(org.getId(), 0) >= ORG_LOYAL_VISITS) {
				score *= 0.5;
			}
			var reasons = parts.stream().filter(p -> p.reason() != null && p.weight() * p.value() / total >= 0.03)
					.sorted(Comparator.comparingDouble((Part p) -> p.weight() * p.value()).reversed())
					.limit(3).map(Part::reason).toList();
			ranked.add(new Ranked(org, score, distanceKm, reasons.isEmpty() ? List.of(activeReason) : reasons, sports,
					count, hosted));
		}
		ranked.sort(Comparator.comparingDouble(Ranked::score).reversed().thenComparing(r -> r.org().getName()));
		return ranked.stream().limit(Math.clamp(limit, 1, 20))
				.map(r -> mapper.toOrganization(organizationMapper.toShort(r.org()), r.org().getCity(),
						r.org().getDescription(), r.org().getLogoFileId(),
						r.sports().stream().map(population.sportsById::get).filter(Objects::nonNull)
								.map(sportMapper::toResponse).toList(),
						r.upcoming(), r.hosted(), r.distanceKm(), r.score(), r.reasons()))
				.toList();
	}

	/** Признак клуба: значение, вес и причина. */
	private record Part(double value, double weight, RecommendationReason reason) {
	}

	/** Σ интереса к видам клуба (с похожими видами) / √(число видов): узкий клуб «моего» вида не проигрывает широкому. */
	private static Part organizationSport(RecommendationSignals.Profile profile,
			RecommendationSignals.Population population, Set<UUID> sports) {
		double sum = 0;
		var mine = new ArrayList<String>();
		String related = null;
		double bestRelated = 0;
		for (var sportId : sports) {
			var direct = profile.affinity(sportId);
			double viaSimilar = 0;
			UUID similarTo = null;
			for (var entry : profile.affinity().entrySet()) {
				var value = 0.6 * entry.getValue() * population.sportSimilarity(entry.getKey(), sportId);
				if (!entry.getKey().equals(sportId) && value > viaSimilar) {
					viaSimilar = value;
					similarTo = entry.getKey();
				}
			}
			sum += Math.max(direct, viaSimilar);
			if (direct > 0) {
				mine.add(EventScorer.lower(population.sportsById.get(sportId)));
			} else if (viaSimilar > bestRelated) {
				bestRelated = viaSimilar;
				related = EventScorer.lower(population.sportsById.get(similarTo));
			}
		}
		var value = sports.isEmpty() ? 0 : RecommendationMath.clamp01(sum / Math.sqrt(sports.size()));
		RecommendationReason reason = null;
		if (!mine.isEmpty()) {
			reason = EventScorer.reason(RecommendationReasonCode.YOUR_SPORT,
					"Ваши виды: " + String.join(", ", mine.subList(0, Math.min(2, mine.size()))));
		} else if (related != null) {
			reason = EventScorer.reason(RecommendationReasonCode.RELATED_SPORT, "Похоже на ваш интерес: " + related);
		}
		return new Part(value, ORG_SPORT, reason);
	}

	/**
	 * Похожесть кандидата на исходное мероприятие: 0.45 вид спорта + 0.15 уровень + 0.15 место (ядро 5 км)
	 * + 0.10 время (час суток и день недели) + 0.15 общие участники (Жаккар со сжатием).
	 */
	private static double itemSimilarity(EventScorer.Candidate source, EventScorer.Candidate candidate,
			double sportSimilarity, RecommendationSignals.Profile profile) {
		var a = source.event();
		var b = candidate.event();
		double level = a.getLevel() == EventLevel.ANY || b.getLevel() == EventLevel.ANY ? 0.85
				: switch (Math.abs(a.getLevel().ordinal() - b.getLevel().ordinal())) {
					case 0 -> 1;
					case 1 -> 0.5;
					default -> 0;
				};
		double place;
		if (a.getFormat() == EventFormat.ONLINE && b.getFormat() == EventFormat.ONLINE) {
			place = 1;
		} else if (a.getLat() != null && b.getLat() != null && a.getLon() != null && b.getLon() != null) {
			place = RecommendationMath.gaussian(Geo.haversineKm(a.getLat(), a.getLon(), b.getLat(), b.getLon()), 5);
		} else {
			place = 0.3;
		}
		double time = 0.5;
		if (source.occurrence() != null && candidate.occurrence() != null) {
			var zone = EventScorer.zoneOf(a, profile.zone());
			var first = source.startAt().atZone(zone);
			var second = candidate.startAt().atZone(EventScorer.zoneOf(b, profile.zone()));
			var hours = RecommendationMath.circularDistance(first.getHour() + first.getMinute() / 60.0,
					second.getHour() + second.getMinute() / 60.0, 24);
			time = 0.6 * RecommendationMath.gaussian(hours, 3) + (first.getDayOfWeek() == second.getDayOfWeek() ? 0.4 : 0);
		}
		var common = RecommendationMath.intersection(source.participants(), candidate.participants());
		var people = RecommendationMath.shrink(RecommendationMath.jaccard(source.participants(), candidate.participants()),
				common, 3);
		return 0.45 * sportSimilarity + 0.15 * level + 0.15 * place + 0.10 * time + 0.15 * people;
	}

	/** Почему не показываем; null — показываем. */
	private String excludedReason(Context context, EventScorer.Scored scored) {
		var profile = context.profile();
		var candidate = scored.candidate();
		var event = candidate.event();
		if (profile.role() != SystemRole.USER) {
			return "Подборка — для участников: аккаунт организации и администратор не записываются на мероприятия";
		}
		if (event.getStatus() != EventStatus.PUBLISHED) {
			return event.getStatus() == EventStatus.DELETED ? "Мероприятие удалено" : "Мероприятие снято с публикации";
		}
		// как EventAccessPolicy.isOrganizer, но без запроса на каждое мероприятие
		if (event.getAuthorId().equals(profile.userId()) || context.coOrganized().contains(event.getId())) {
			return "Вы организатор этого мероприятия";
		}
		var status = profile.myStatus().get(event.getId());
		if (status != null && ACTIVE.contains(status)) {
			return "Вы уже записаны";
		}
		if (status == RegistrationStatus.REJECTED) {
			return "Организатор уже отклонил вашу заявку";
		}
		if (profile.dismissedEvents().contains(event.getId())) {
			return "Вы скрыли его из подборки";
		}
		if (candidate.occurrence() == null) {
			return "Ближайших занятий нет";
		}
		if (isFullSingle(candidate)) {
			return "Мест нет";
		}
		if (scored.distanceKm() != null && scored.distanceKm() > profile.radiusKm() * properties.maxDistanceFactor()) {
			return "Слишком далеко: " + EventScorer.formatDistance(scored.distanceKm());
		}
		return null;
	}

	/** Разовое с лимитом, где все места заняты (у серии лимит — на занятие, вступить можно всегда). */
	private static boolean isFullSingle(EventScorer.Candidate candidate) {
		var event = candidate.event();
		return !event.isRecurring() && event.getCapacity() != null && candidate.count() >= event.getCapacity();
	}

	/** Слот «Попробуйте новое»: первая причина — новый вид, дальше до двух других (не про вид спорта). */
	private static List<RecommendationReason> discoveryReasons(EventScorer.Scored scored) {
		var result = new ArrayList<RecommendationReason>();
		result.add(EventScorer.reason(RecommendationReasonCode.NEW_SPORT,
				"Попробуйте новое: " + EventScorer.lower(scored.candidate().sport())));
		scored.reasons().stream()
				.filter(r -> r.code() != RecommendationReasonCode.YOUR_SPORT && r.code() != RecommendationReasonCode.RELATED_SPORT)
				.limit(2).forEach(result::add);
		return result;
	}

	/**
	 * Кандидаты с ближайшим занятием в [from, to] (null — занятий нет), числом участников и подписью организатора.
	 * Все данные — по одному запросу на список.
	 */
	private List<EventScorer.Candidate> candidates(List<Event> eventList, RecommendationSignals.Population population,
			Instant from, Instant to) {
		if (eventList.isEmpty()) {
			return List.of();
		}
		var ids = eventList.stream().map(Event::getId).toList();
		var nearest = new HashMap<UUID, EventOccurrence>();
		occurrences.findNearest(ids, OccurrenceStatus.SCHEDULED, from, to)
				.forEach(o -> nearest.putIfAbsent(o.getEventId(), o));
		var seriesOccurrences = eventList.stream().filter(Event::isRecurring).map(e -> nearest.get(e.getId()))
				.filter(Objects::nonNull).map(EventOccurrence::getId).toList();
		var attendees = seriesOccurrences.isEmpty() ? Map.<UUID, Long>of()
				: attendances.countByOccurrenceIds(seriesOccurrences).stream().collect(Collectors.toMap(
						OccurrenceAttendanceRepository.OccurrenceCount::getOccurrenceId,
						OccurrenceAttendanceRepository.OccurrenceCount::getCount));
		var keys = new HashSet<UUID>();
		eventList.forEach(e -> keys.add(organizerKey(e)));
		var names = signals.organizerNames(keys);
		return eventList.stream().map(event -> {
			var occurrence = nearest.get(event.getId());
			var participants = population.participants(event.getId());
			long count = event.isRecurring()
					? (occurrence != null ? attendees.getOrDefault(occurrence.getId(), 0L) : 0)
					: participants.size();
			var key = organizerKey(event);
			return new EventScorer.Candidate(event, population.sportsById.get(event.getSportId()), occurrence, count,
					participants, key, names.getOrDefault(key, "организатор"));
		}).toList();
	}

	private static UUID organizerKey(Event event) {
		return event.getOrganizationId() != null ? event.getOrganizationId() : event.getAuthorId();
	}

	private static Map<UUID, EventSummaryResponse> byId(List<EventSummaryResponse> summaries) {
		return summaries.stream().collect(Collectors.toMap(EventSummaryResponse::id, Function.identity()));
	}
}
