package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.hackathon.app.domain.dto.AwardCandidateResponse;
import com.hackathon.app.domain.dto.OrganizationAwardResponse;
import com.hackathon.app.domain.dto.WalletEntryResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.CoinLedgerEntry;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.OrganizationAward;
import com.hackathon.app.domain.entity.UserAchievement;
import com.hackathon.app.domain.entity.UserItem;
import com.hackathon.app.domain.enums.AchievementCode;
import com.hackathon.app.domain.enums.AwardStatus;
import com.hackathon.app.domain.enums.LedgerKind;
import com.hackathon.app.domain.enums.OrganizationAwardKind;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/** Монеты, инвентарь, достижения и награды организаций: сервисы решают, мапперы заполняют поля. */
@Mapper(config = MappingConfig.class)
public interface EconomyMapper {

	/** Новая строка журнала. */
	CoinLedgerEntry toEntry(UUID userId, int amount, LedgerKind kind, String refKey, String note, UUID eventId,
			UUID occurrenceId, Instant occurredAt);

	/** Новый баланс пользователя (под блокировкой строки). */
	void setCoins(@MappingTarget AppUser user, Integer coins);

	UserItem toUserItem(UUID userId, UUID itemId);

	UserAchievement toAchievement(UUID userId, AchievementCode code);

	/** Занятие обработано начислением. */
	void markProcessed(@MappingTarget EventOccurrence occurrence, Instant rewardProcessedAt);

	OrganizationAward toAward(UUID organizationId, OrganizationAwardKind kind, LocalDate period, int score, AwardStatus status,
			Instant confirmedAt, UUID confirmedById);

	/** Админ подтвердил награду. */
	void confirm(@MappingTarget OrganizationAward award, AwardStatus status, Instant confirmedAt, UUID confirmedById);

	@Mapping(target = "organizationName", source = "organizationName")
	OrganizationAwardResponse toResponse(OrganizationAward award, String organizationName);

	WalletEntryResponse toEntryResponse(CoinLedgerEntry entry, String eventTitle);

	AwardCandidateResponse toCandidate(UUID organizationId, String organizationName, int meetings, int participants,
			int returning, int moderated, int score);
}
