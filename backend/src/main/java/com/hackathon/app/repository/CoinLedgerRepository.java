package com.hackathon.app.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.CoinLedgerEntry;
import com.hackathon.app.domain.enums.LedgerKind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CoinLedgerRepository extends JpaRepository<CoinLedgerEntry, UUID> {

	boolean existsByRefKey(String refKey);

	/** Последние операции пользователя, свежие сверху. */
	List<CoinLedgerEntry> findTop20ByUserIdOrderByOccurredAtDescCreatedAtDesc(UUID userId);

	/** Начисления за встречи начиная с момента since, свежие сверху: для фразы бобра. */
	List<CoinLedgerEntry> findByUserIdAndKindInAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(UUID userId,
			Collection<LedgerKind> kinds, Instant since);

	long countByUserIdAndKind(UUID userId, LedgerKind kind);

	/** Сколько оплаченных встреч у пользователя за период [from, to): для дневного лимита и энергии. */
	long countByUserIdAndKindInAndOccurredAtGreaterThanEqualAndOccurredAtLessThan(UUID userId,
			Collection<LedgerKind> kinds, Instant from, Instant to);

	/** Сколько разных видов спорта у оплаченных встреч участника. */
	@Query("""
			select count(distinct e.sportId) from CoinLedgerEntry l join Event e on e.id = l.eventId
			where l.userId = :userId and l.kind = com.hackathon.app.domain.enums.LedgerKind.MEETING""")
	long countDistinctSports(UUID userId);

	/** Сколько оплаченных встреч участника у организации с таким служебным кодом. */
	@Query("""
			select count(l) from CoinLedgerEntry l join Event e on e.id = l.eventId
			join Organization o on o.id = e.organizationId
			where l.userId = :userId and l.kind = com.hackathon.app.domain.enums.LedgerKind.MEETING
			  and o.code = :organizationCode""")
	long countMeetingsOfOrganization(UUID userId, String organizationCode);
}
