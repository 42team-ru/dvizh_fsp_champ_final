package com.hackathon.app.service;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.LedgerKind;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.mapper.EconomyMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.CoinLedgerRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Начисление монет за закончившиеся встречи (docs/economy.md, раздел 2). Все правила — здесь.
 * <p>
 * Как это работает. Фоновая задача раз в 15 минут берёт начавшиеся занятия без отметки reward_processed_at, выбирает
 * закончившиеся (конец: endAt или начало + 2 часа) и обрабатывает каждое в своей транзакции: ставит отметку
 * «обработано» и начисляет. Награда платится, если мероприятие PUBLISHED, занятие не отменено и кворум не сорван.
 * Участникам: +10 за встречу (не больше 3 оплачиваемых встреч в день), +30 за первую встречу.
 * Организатору-человеку (без организации): если пришли 3+ участника старше суток — 30 + 5 за каждого, не больше 80
 * (не больше 2 в день), +50 за первую проведённую. Организациям монеты не платятся.
 * <p>
 * Идемпотентность двойная: отметка на занятии и уникальный refKey каждой строки журнала. Поэтому повторный запуск,
 * параллельный запуск или падение посреди обработки не создают дублей.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RewardService {

	static final int MEETING_REWARD = 10;
	static final int FIRST_MEETING_BONUS = 30;
	static final int ORGANIZER_BASE = 30;
	static final int ORGANIZER_PER_PARTICIPANT = 5;
	static final int ORGANIZER_MAX = 80;
	static final int FIRST_ORGANIZED_BONUS = 50;
	/** Меньше стольких «настоящих» участников организатору не платим. */
	static final int ORGANIZER_MIN_PARTICIPANTS = 3;
	static final int PARTICIPANT_DAILY_LIMIT = 3;
	static final int ORGANIZER_DAILY_LIMIT = 2;
	/** Организатору засчитываются только участники с аккаунтом старше суток. */
	private static final Duration MIN_ACCOUNT_AGE = Duration.ofHours(24);
	/** За один запуск обрабатываем не больше стольких занятий. */
	private static final int BATCH = 500;

	private final EventOccurrenceRepository occurrences;
	private final EventRepository events;
	private final AppUserRepository users;
	private final CoinLedgerRepository ledger;
	private final WalletService wallet;
	private final AchievementService achievements;
	private final MeetingAttendance attendance;
	private final OrganizationAwardService awards;
	private final EconomyMapper mapper;
	private final DbTimeRepository time;
	private final PlatformTransactionManager transactionManager;

	/** Обработать все закончившиеся занятия; возвращает, сколько обработано. Ошибка одного занятия не мешает остальным. */
	public int processDue() {
		var now = time.now();
		var due = occurrences.findPendingReward(now).stream()
				.filter(o -> !attendance.endOf(o).isAfter(now)).limit(BATCH).map(EventOccurrence::getId).toList();
		var tx = new TransactionTemplate(transactionManager);
		int done = 0;
		for (var id : due) {
			try {
				tx.executeWithoutResult(status -> processOne(id, now));
				done++;
			} catch (RuntimeException e) {
				log.warn("Reward processing failed: occurrenceId={}", id, e);
			}
		}
		if (done > 0) {
			log.info("Rewards processed: occurrences={}", done);
		}
		return done;
	}

	/** Одно занятие, в транзакции вызывающего. */
	void processOne(UUID occurrenceId, Instant now) {
		var occurrence = occurrences.findById(occurrenceId).orElseThrow(() -> new NoSuchElementException("Занятие не найдено"));
		if (occurrence.getRewardProcessedAt() != null) {
			return;
		}
		mapper.markProcessed(occurrence, now); // отметка ставится в любом случае: сорванное занятие не проверяем снова
		var event = events.findById(occurrence.getEventId()).orElseThrow();
		if (event.getStatus() != EventStatus.PUBLISHED || occurrence.getStatus() != OccurrenceStatus.SCHEDULED) {
			return;
		}
		// Монеты только у личных аккаунтов: ORG и ADMIN пропускаются (в том числе как участники).
		var everyone = attendance.participants(event, occurrence);
		var personal = users.findAllById(everyone).stream()
				.filter(u -> u.getSystemRole() == SystemRole.USER).map(AppUser::getId).toList();
		var participants = personal;
		if (participants.isEmpty() || attendance.quorumFailed(event, occurrence, everyone.size())) {
			return;
		}
		var end = attendance.endOf(occurrence);
		var dayStart = end.atZone(MeetingAttendance.ZONE).toLocalDate().atStartOfDay(MeetingAttendance.ZONE).toInstant();
		var dayEnd = dayStart.plus(Duration.ofDays(1));
		var touched = new LinkedHashSet<UUID>();
		for (var userId : participants) {
			if (rewardParticipant(userId, event, occurrence, end, dayStart, dayEnd)) {
				touched.add(userId);
			}
		}
		if (event.getOrganizationId() == null && isPersonal(event.getAuthorId())
				&& rewardOrganizer(event, occurrence, participants, now, end, dayStart, dayEnd)) {
			touched.add(event.getAuthorId());
		}
		touched.forEach(achievements::check);
		if (event.getOrganizationId() != null) { // награды организаций: вехи выдаются той же задачей, один раз
			awards.grantMilestones(event.getOrganizationId());
		}
	}

	private boolean isPersonal(UUID userId) {
		return users.findById(userId).map(u -> u.getSystemRole() == SystemRole.USER).orElse(false);
	}

	private boolean rewardParticipant(UUID userId, Event event, EventOccurrence occurrence, Instant end,
			Instant dayStart, Instant dayEnd) {
		if (ledger.countByUserIdAndKindInAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(userId,
				List.of(LedgerKind.MEETING), dayStart, dayEnd) >= PARTICIPANT_DAILY_LIMIT) {
			return false;
		}
		if (!wallet.apply(userId, MEETING_REWARD, LedgerKind.MEETING, "MEETING:" + occurrence.getId() + ":" + userId,
				"Встреча", event.getId(), occurrence.getId(), end)) {
			return false;
		}
		wallet.apply(userId, FIRST_MEETING_BONUS, LedgerKind.FIRST_MEETING, "FIRST_MEETING:" + userId,
				"Первая встреча на платформе", event.getId(), occurrence.getId(), end);
		return true;
	}

	private boolean rewardOrganizer(Event event, EventOccurrence occurrence, List<UUID> participants, Instant now,
			Instant end, Instant dayStart, Instant dayEnd) {
		var author = event.getAuthorId();
		var counted = users.findAllById(participants).stream().filter(AppUser::isActive)
				.filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isBefore(now.minus(MIN_ACCOUNT_AGE))).count();
		if (counted < ORGANIZER_MIN_PARTICIPANTS || ledger.countByUserIdAndKindInAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
				author, List.of(LedgerKind.ORGANIZER_MEETING), dayStart, dayEnd) >= ORGANIZER_DAILY_LIMIT) {
			return false;
		}
		int amount = (int) Math.min(ORGANIZER_MAX, ORGANIZER_BASE + ORGANIZER_PER_PARTICIPANT * counted);
		if (!wallet.apply(author, amount, LedgerKind.ORGANIZER_MEETING, "ORGANIZER_MEETING:" + occurrence.getId(),
				"Проведённая встреча", event.getId(), occurrence.getId(), end)) {
			return false;
		}
		wallet.apply(author, FIRST_ORGANIZED_BONUS, LedgerKind.FIRST_ORGANIZED, "FIRST_ORGANIZED:" + author,
				"Первая проведённая встреча", event.getId(), occurrence.getId(), end);
		return true;
	}
}
