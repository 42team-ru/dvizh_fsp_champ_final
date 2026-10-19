package com.hackathon.app.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.WalletResponse;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.enums.LedgerKind;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.EconomyMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.CoinLedgerRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static java.util.stream.Collectors.toSet;

/**
 * Монеты: единственное место, где меняется баланс. Каждая операция — строка журнала с уникальным refKey
 * (повтор того же начисления ничего не делает) и обновление users.coins под блокировкой строки пользователя.
 * Здесь же уровень и энергия бобра, которые считаются из журнала.
 */
@Service
@RequiredArgsConstructor
public class WalletService {

	/** Каждые столько засчитанных встреч — новый уровень. */
	static final int MEETINGS_PER_LEVEL = 5;
	/** Максимум энергии: засчитанные встречи за последнюю неделю. */
	static final int ENERGY_MAX = 5;
	/** Виды записей, считающихся «засчитанной встречей». */
	static final List<LedgerKind> MEETING_KINDS = List.of(LedgerKind.MEETING, LedgerKind.ORGANIZER_MEETING);

	static final String PERSONAL_ONLY = "Монеты и достижения есть только у личных аккаунтов";

	private final AppUserRepository users;
	private final CoinLedgerRepository ledger;
	private final EventRepository events;
	private final EconomyMapper mapper;
	private final DbTimeRepository time;

	/**
	 * Начислить (amount больше нуля) или списать монеты. false — такая операция уже была (refKey занят).
	 * Не хватает монет — 409.
	 */
	@Transactional
	public boolean apply(UUID userId, int amount, LedgerKind kind, String refKey, String note, UUID eventId,
			UUID occurrenceId, Instant occurredAt) {
		var user = users.findByIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		if (user.getSystemRole() != SystemRole.USER) {
			throw new ForbiddenException(PERSONAL_ONLY); // последняя защита: ORG и ADMIN монет не получают
		}
		if (ledger.existsByRefKey(refKey)) {
			return false;
		}
		if (user.getCoins() + amount < 0) {
			throw new ConflictException("Не хватает монет: нужно " + (-amount) + ", у тебя " + user.getCoins());
		}
		ledger.save(mapper.toEntry(userId, amount, kind, refKey, note, eventId, occurrenceId, occurredAt));
		mapper.setCoins(user, user.getCoins() + amount);
		return true;
	}

	/** Монеты и достижения есть только у личных аккаунтов (USER); ORG и ADMIN — 403. */
	@Transactional(readOnly = true)
	public void requireUserAccount(UUID userId) {
		var user = users.findById(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		if (user.getSystemRole() != SystemRole.USER) {
			throw new ForbiddenException(PERSONAL_ONLY);
		}
	}

	@Transactional(readOnly = true)
	public int balance(UUID userId) {
		return users.findById(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден")).getCoins();
	}

	/** Кошелёк: баланс, уровень, энергия и последние 20 операций. */
	@Transactional(readOnly = true)
	public WalletResponse wallet(UUID userId) {
		requireUserAccount(userId);
		var now = time.now();
		var counted = countedMeetings(userId);
		var energy = (int) Math.min(ENERGY_MAX, ledger.countByUserIdAndKindInAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(
				userId, MEETING_KINDS, now.minus(Duration.ofDays(7)), now.plusSeconds(1)));
		var recent = ledger.findTop20ByUserIdOrderByOccurredAtDescCreatedAtDesc(userId);
		Map<UUID, Event> eventById = events.findAllById(recent.stream().map(e -> e.getEventId())
				.filter(java.util.Objects::nonNull).collect(toSet())).stream()
				.collect(Collectors.toMap(Event::getId, Function.identity()));
		var entries = recent.stream().map(e -> mapper.toEntryResponse(e,
				e.getEventId() == null || !eventById.containsKey(e.getEventId()) ? null
						: eventById.get(e.getEventId()).getTitle())).toList();
		return new WalletResponse(balance(userId), 1 + counted / MEETINGS_PER_LEVEL, counted, energy, ENERGY_MAX, entries);
	}

	/** Засчитанные встречи для уровня: проведённая считается за две. */
	private int countedMeetings(UUID userId) {
		return (int) (ledger.countByUserIdAndKind(userId, LedgerKind.MEETING)
				+ 2 * ledger.countByUserIdAndKind(userId, LedgerKind.ORGANIZER_MEETING));
	}
}
