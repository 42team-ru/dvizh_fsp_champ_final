package com.hackathon.app.service;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.AchievementResponse;
import com.hackathon.app.domain.entity.UserAchievement;
import com.hackathon.app.domain.enums.AchievementCode;
import com.hackathon.app.domain.enums.LedgerKind;
import com.hackathon.app.domain.mapper.EconomyMapper;
import com.hackathon.app.repository.CoinLedgerRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.UserAchievementRepository;
import com.hackathon.app.util.AchievementImages;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Шесть достижений. Прогресс считается из журнала засчитанных встреч (coin_ledger), награда — монеты или вещь.
 * «Свой бобр» определяется по служебному коду организации {@link #BEAVERS_ORGANIZATION_CODE}: он не зависит от
 * названия, которое организация может поменять.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AchievementService {

	/** Служебный код организации ССК ВГУ «Хищные бобры» (organizations.code). */
	public static final String BEAVERS_ORGANIZATION_CODE = "predatory-beavers";

	private final UserAchievementRepository achievements;
	private final CoinLedgerRepository ledger;
	private final WalletService wallet;
	private final ShopService shop;
	private final EconomyMapper mapper;
	private final DbTimeRepository time;

	/** Все шесть достижений с прогрессом; полученные — с датой. */
	@Transactional(readOnly = true)
	public List<AchievementResponse> list(UUID userId) {
		wallet.requireUserAccount(userId);
		var earned = achievements.findByUserId(userId).stream()
				.collect(Collectors.toMap(UserAchievement::getCode, Function.identity()));
		return Arrays.stream(AchievementCode.values()).map(code -> {
			var mine = earned.get(code);
			var progress = mine != null ? code.getGoal() : Math.min(code.getGoal(), progress(userId, code));
			return new AchievementResponse(code, code.getTitle(), code.getDescription(), progress, code.getGoal(),
					code.getUnit(), reward(code), mine == null ? null : mine.getCreatedAt(), AchievementImages.url(code));
		}).toList();
	}

	/** Выдать достижения, условия которых выполнены. Вызывается после начисления за встречу. */
	@Transactional
	public void check(UUID userId) {
		for (var code : AchievementCode.values()) {
			if (!achievements.existsByUserIdAndCode(userId, code) && progress(userId, code) >= code.getGoal()) {
				grant(userId, code);
			}
		}
	}

	/** Выдать достижение с наградой; повтор ничего не меняет. */
	@Transactional
	public void grant(UUID userId, AchievementCode code) {
		if (achievements.existsByUserIdAndCode(userId, code)) {
			return;
		}
		achievements.save(mapper.toAchievement(userId, code));
		if (code.getRewardCoins() > 0) {
			wallet.apply(userId, code.getRewardCoins(), LedgerKind.ACHIEVEMENT, "ACHIEVEMENT:" + code + ":" + userId,
					"Достижение «" + code.getTitle() + "»", null, null, time.now());
		}
		if (code.getRewardItem() != null) {
			shop.grant(userId, code.getRewardItem());
		}
		log.info("Achievement granted: userId={}, code={}", userId, code);
	}

	private int progress(UUID userId, AchievementCode code) {
		return (int) switch (code) {
			case FIRST_STEP, REGULAR -> ledger.countByUserIdAndKind(userId, LedgerKind.MEETING);
			case VERSATILE -> ledger.countDistinctSports(userId);
			case TEAM_BUILDER, SOUL_OF_COMPANY -> ledger.countByUserIdAndKind(userId, LedgerKind.ORGANIZER_MEETING);
			case OWN_BEAVER -> ledger.countMeetingsOfOrganization(userId, BEAVERS_ORGANIZATION_CODE);
		};
	}

	private String reward(AchievementCode code) {
		return code.getRewardItem() != null ? "Вещь: " + shop.itemLabel(code.getRewardItem())
				: "+" + code.getRewardCoins() + " монет";
	}
}
