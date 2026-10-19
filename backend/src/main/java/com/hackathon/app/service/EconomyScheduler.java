package com.hackathon.app.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Фоновые задачи экономики. Выключаются свойством app.economy.scheduler-enabled=false
 * (в тестах на H2 выключены, чтобы фон не менял данные посреди теста).
 */
@Slf4j
@Component
@EnableScheduling
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.economy.scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class EconomyScheduler {

	private final RewardService rewards;
	private final OrganizationAwardService awards;

	/** Раз в 15 минут: награды за закончившиеся встречи. Первый запуск через минуту после старта. */
	@Scheduled(initialDelayString = "PT1M", fixedDelayString = "PT15M")
	public void processRewards() {
		try {
			rewards.processDue();
		} catch (RuntimeException e) {
			log.warn("Reward job failed", e);
		}
	}

	/** Раз в час проверяет, есть ли предложение «Организации месяца» за прошлый месяц; в первый день месяца создаёт его. */
	@Scheduled(initialDelayString = "PT2M", fixedDelayString = "PT1H")
	public void proposeAward() {
		try {
			awards.proposePreviousMonth();
			awards.grantMilestonesForAll();
		} catch (RuntimeException e) {
			log.warn("Award job failed", e);
		}
	}
}
