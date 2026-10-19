package com.hackathon.app.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.AdminAwardsResponse;
import com.hackathon.app.domain.dto.AwardBadgeResponse;
import com.hackathon.app.domain.dto.AwardCandidateResponse;
import com.hackathon.app.domain.dto.FeaturedOrganizationResponse;
import com.hackathon.app.domain.dto.OrganizationAwardResponse;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.OrganizationAward;
import com.hackathon.app.domain.enums.AwardStatus;
import com.hackathon.app.domain.enums.OrganizationAwardKind;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.EconomyMapper;
import com.hackathon.app.domain.mapper.OrganizationMapper;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.OrganizationAwardRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.util.AchievementImages;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * «Организация месяца» (docs/economy.md, раздел 5). Счёт за месяц = уникальные пришедшие участники ×3 +
 * вернувшиеся (были у этой организации и раньше) ×5 − 30 за каждое снятое или удалённое админом событие.
 * Участвуют одобренные организации с 2+ состоявшимися встречами за месяц. Сервер предлагает победителя за прошлый
 * месяц (PROPOSED), админ подтверждает (CONFIRMED). Подтверждённая награда — бейдж и блок в ленте.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizationAwardService {

	private static final int PARTICIPANT_POINTS = 3;
	private static final int RETURNING_POINTS = 5;
	private static final int MODERATION_PENALTY = 30;
	private static final int MIN_MEETINGS = 2;
	private static final int TOP = 5;
	private static final Instant BEGINNING = Instant.parse("2000-01-01T00:00:00Z");

	private final OrganizationAwardRepository awards;
	private final OrganizationRepository organizations;
	private final EventOccurrenceRepository occurrences;
	private final EventRepository events;
	private final MeetingAttendance attendance;
	private final EconomyMapper mapper;
	private final OrganizationMapper organizationMapper;
	private final DbTimeRepository time;

	/** Предложить победителя за прошлый месяц, если награды за него ещё нет. Безопасно вызывать сколько угодно раз. */
	@Transactional
	public void proposePreviousMonth() {
		propose(previousMonth(time.now()));
	}

	/** Предложить победителя периода (первый день месяца); false — награда уже есть или нет подходящих кандидатов. */
	@Transactional
	public boolean propose(LocalDate period) {
		if (awards.existsByPeriod(period)) {
			return false;
		}
		var best = candidates(period).stream().findFirst().filter(c -> c.score() > 0);
		if (best.isEmpty()) {
			return false;
		}
		awards.save(mapper.toAward(best.get().organizationId(), OrganizationAwardKind.ORG_OF_MONTH, period, best.get().score(), AwardStatus.PROPOSED, null, null));
		log.info("Organization award proposed: period={}, organizationId={}, score={}", period,
				best.get().organizationId(), best.get().score());
		return true;
	}

	/** Предложение месяца и лучшие кандидаты. Без месяца — самое свежее ожидающее подтверждения, иначе прошлый месяц. */
	@Transactional(readOnly = true)
	public AdminAwardsResponse forAdmin(YearMonth month) {
		var period = month != null ? month.atDay(1)
				: awards.findFirstByStatusOrderByPeriodDesc(AwardStatus.PROPOSED).map(OrganizationAward::getPeriod)
						.orElseGet(() -> previousMonth(time.now()));
		var award = awards.findByPeriod(period).map(this::toResponse).orElse(null);
		return new AdminAwardsResponse(period, award, candidates(period).stream().limit(TOP).toList());
	}

	/** Подтвердить награду; повторное подтверждение ничего не меняет. */
	@Transactional
	public OrganizationAwardResponse confirm(UUID awardId, UUID adminId) {
		var award = awards.findById(awardId).orElseThrow(() -> new NoSuchElementException("Награда не найдена"));
		if (award.getStatus() == AwardStatus.PROPOSED) {
			var org = organizations.findById(award.getOrganizationId()).orElseThrow();
			if (org.getStatus() != OrganizationStatus.APPROVED) {
				throw new ConflictException("Организация больше не допущена на платформе, награду подтвердить нельзя");
			}
			mapper.confirm(award, AwardStatus.CONFIRMED, time.now(), adminId);
		}
		return toResponse(award);
	}

	/** Организация месяца для ленты: подтверждённая награда за прошлый или текущий месяц; null — нет. */
	@Transactional(readOnly = true)
	public FeaturedOrganizationResponse featured() {
		return awards.findFirstByStatusAndPeriodGreaterThanEqualOrderByPeriodDesc(AwardStatus.CONFIRMED,
						previousMonth(time.now()))
				.flatMap(a -> organizations.findByIdAndStatus(a.getOrganizationId(), OrganizationStatus.APPROVED)
						.map(org -> organizationMapper.toFeatured(org, a.getPeriod())))
				.orElse(null);
	}

	/** Все четыре вида наград организации: полученные с датой, вехи с прогрессом. */
	@Transactional(readOnly = true)
	public List<AwardBadgeResponse> badges(UUID organizationId) {
		var mine = awards.findByOrganizationId(organizationId).stream()
				.filter(a -> a.getStatus() == AwardStatus.CONFIRMED).toList();
		var stats = stats(organizationId);
		var result = new java.util.ArrayList<AwardBadgeResponse>();
		for (var kind : List.of(OrganizationAwardKind.FIRST_MEETING, OrganizationAwardKind.PARTICIPANTS_100,
				OrganizationAwardKind.RETURNING_20)) {
			var earned = mine.stream().filter(a -> a.getKind() == kind).findFirst();
			result.add(new AwardBadgeResponse(kind, kind.getTitle(), kind.getDescription(), earned.isPresent(),
					earned.map(a -> a.getConfirmedAt()).orElse(null), null,
					earned.isPresent() ? kind.getGoal() : Math.min(kind.getGoal(), stats.progress(kind)), kind.getGoal(),
					AchievementImages.url(kind)));
		}
		var months = mine.stream().filter(a -> a.getKind() == OrganizationAwardKind.ORG_OF_MONTH)
				.sorted(Comparator.comparing(OrganizationAward::getPeriod).reversed()).toList();
		var month = OrganizationAwardKind.ORG_OF_MONTH;
		if (months.isEmpty()) {
			result.add(new AwardBadgeResponse(month, month.getTitle(), month.getDescription(), false, null, null, 0, 0,
					AchievementImages.url(month)));
		}
		months.forEach(a -> result.add(new AwardBadgeResponse(month, month.getTitle(), month.getDescription(), true,
				a.getConfirmedAt(), a.getPeriod(), 0, 0, AchievementImages.url(month))));
		return result;
	}

	/**
	 * Выдать организации вехи, цели которых достигнуты (автоматически, один раз, без монет и вещей).
	 * Вызывается задачей начисления сразу после обработки занятия организации.
	 */
	@Transactional
	public void grantMilestones(UUID organizationId) {
		var stats = stats(organizationId);
		var now = time.now();
		for (var kind : List.of(OrganizationAwardKind.FIRST_MEETING, OrganizationAwardKind.PARTICIPANTS_100,
				OrganizationAwardKind.RETURNING_20)) {
			if (stats.progress(kind) >= kind.getGoal() && !awards.existsByOrganizationIdAndKind(organizationId, kind)) {
				awards.save(mapper.toAward(organizationId, kind, null, 0, AwardStatus.CONFIRMED, now, null));
				log.info("Organization milestone granted: organizationId={}, kind={}", organizationId, kind);
			}
		}
	}

	/** Проверить вехи у всех одобренных организаций (догоняет организации с историей до включения экономики). */
	@Transactional
	public void grantMilestonesForAll() {
		organizations.findByStatus(OrganizationStatus.APPROVED).forEach(o -> grantMilestones(o.getId()));
	}

	/** Показатели организации по её состоявшимся встречам: встречи с людьми, всего пришедших, пришедшие повторно. */
	private record Stats(int meetingsWithPeople, int attendances, int returning) {

		int progress(OrganizationAwardKind kind) {
			return switch (kind) {
				case FIRST_MEETING -> meetingsWithPeople;
				case PARTICIPANTS_100 -> attendances;
				case RETURNING_20 -> returning;
				case ORG_OF_MONTH -> 0;
			};
		}
	}

	private Stats stats(UUID organizationId) {
		var now = time.now();
		var started = occurrences.findOrganizationStarted(organizationId, now).stream()
				.filter(o -> !attendance.endOf(o).isAfter(now)).toList();
		var eventById = new HashMap<UUID, Event>();
		events.findAllById(started.stream().map(EventOccurrence::getEventId).collect(Collectors.toSet()))
				.forEach(e -> eventById.put(e.getId(), e));
		int meetings = 0;
		int total = 0;
		Map<UUID, Integer> visits = new HashMap<>();
		for (var o : started) {
			var event = eventById.get(o.getEventId());
			var people = attendance.participants(event, o);
			if (people.isEmpty() || attendance.quorumFailed(event, o, people.size())) {
				continue;
			}
			meetings++;
			total += people.size();
			people.forEach(p -> visits.merge(p, 1, Integer::sum));
		}
		return new Stats(meetings, total, (int) visits.values().stream().filter(v -> v >= 2).count());
	}

	/** Кандидаты периода по убыванию счёта. */
	List<AwardCandidateResponse> candidates(LocalDate period) {
		var now = time.now();
		var from = period.atStartOfDay(MeetingAttendance.ZONE).toInstant();
		var to = period.plusMonths(1).atStartOfDay(MeetingAttendance.ZONE).toInstant();
		var approved = organizations.findByStatus(OrganizationStatus.APPROVED).stream()
				.collect(Collectors.toMap(Organization::getId, Function.identity()));
		var monthOccurrences = occurrences.findOrganizationOccurrences(from, to).stream()
				.filter(o -> !attendance.endOf(o).isAfter(now)).toList();
		var priorOccurrences = occurrences.findOrganizationOccurrences(BEGINNING, from);
		var eventById = new HashMap<UUID, Event>();
		events.findAllById(java.util.stream.Stream.concat(monthOccurrences.stream(), priorOccurrences.stream())
				.map(EventOccurrence::getEventId).collect(Collectors.toSet())).forEach(e -> eventById.put(e.getId(), e));

		Map<UUID, Set<UUID>> priorByOrg = new HashMap<>();
		for (var o : priorOccurrences) {
			var event = eventById.get(o.getEventId());
			var people = attendance.participants(event, o);
			if (!attendance.quorumFailed(event, o, people.size())) {
				priorByOrg.computeIfAbsent(event.getOrganizationId(), k -> new HashSet<>()).addAll(people);
			}
		}
		Map<UUID, Set<UUID>> peopleByOrg = new HashMap<>();
		Map<UUID, Integer> meetingsByOrg = new HashMap<>();
		for (var o : monthOccurrences) {
			var event = eventById.get(o.getEventId());
			var people = attendance.participants(event, o);
			if (attendance.quorumFailed(event, o, people.size())) {
				continue;
			}
			meetingsByOrg.merge(event.getOrganizationId(), 1, Integer::sum);
			peopleByOrg.computeIfAbsent(event.getOrganizationId(), k -> new HashSet<>()).addAll(people);
		}
		Map<UUID, Integer> moderatedByOrg = new HashMap<>();
		events.findModeratedOrganizationEvents(from, to).forEach(e -> moderatedByOrg.merge(e.getOrganizationId(), 1, Integer::sum));

		return meetingsByOrg.entrySet().stream()
				.filter(e -> e.getValue() >= MIN_MEETINGS && approved.containsKey(e.getKey()))
				.map(e -> {
					var people = peopleByOrg.getOrDefault(e.getKey(), Set.of());
					var prior = priorByOrg.getOrDefault(e.getKey(), Set.of());
					int returning = (int) people.stream().filter(prior::contains).count();
					int moderated = moderatedByOrg.getOrDefault(e.getKey(), 0);
					int score = PARTICIPANT_POINTS * people.size() + RETURNING_POINTS * returning - MODERATION_PENALTY * moderated;
					return mapper.toCandidate(e.getKey(), approved.get(e.getKey()).getName(), e.getValue(), people.size(),
							returning, moderated, score);
				})
				.sorted(Comparator.comparingInt(AwardCandidateResponse::score).reversed()
						.thenComparing(AwardCandidateResponse::organizationName))
				.toList();
	}

	private OrganizationAwardResponse toResponse(OrganizationAward award) {
		var name = organizations.findById(award.getOrganizationId()).map(Organization::getName).orElse("");
		return mapper.toResponse(award, name);
	}

	private static LocalDate previousMonth(Instant now) {
		return YearMonth.from(now.atZone(MeetingAttendance.ZONE)).minusMonths(1).atDay(1);
	}
}
