package com.hackathon.app.demo;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.hackathon.app.service.RewardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * История проекта «как в жизни», по порядку времени. Каждая встреча — это шаг: её создают обычные сервисы (запись,
 * заявки, обсуждение), затем даты переезжают в прошлое (единственный допустимый обман, см. {@link DemoDataRepository}),
 * и настоящая обработка наград ({@link RewardService#processDue()}) начисляет монеты, достижения и вехи организаций
 * так, как сделала бы фоновая задача в тот самый день. Поэтому встречи проигрываются строго по времени начала:
 * «первая встреча», дневные лимиты и вехи получаются именно у той встречи, которой положено.
 */
@Slf4j
@Component
@RequiredArgsConstructor
class DemoHistory {

	/** Шаг истории: когда встреча начинается, когда заканчивается (null — не про прошлое) и что в ней происходит. */
	private record Step(Instant startAt, Instant endAt, Runnable body) {
	}

	private final RewardService rewards;
	private final DemoDataRepository data;
	private final Clock clock;
	private final List<Step> steps = new ArrayList<>();

	/** Запланировать встречу; body создаёт её сервисами и сам переносит даты. */
	void add(Instant startAt, Instant endAt, Runnable body) {
		steps.add(new Step(startAt, endAt, body));
	}

	/** Проиграть все шаги по времени начала. После каждой прошедшей встречи — настоящее начисление наград. */
	void replay() {
		var now = clock.instant();
		steps.sort(Comparator.comparing(Step::startAt));
		int past = 0;
		for (var step : steps) {
			var since = Instant.now().minus(Duration.ofMillis(5));
			step.body().run();
			data.flushAndClear();
			if (step.endAt().isBefore(now)) {
				rewards.processDue();
				data.stampEconomy(since, step.endAt());
				data.flushAndClear();
				past++;
			}
		}
		log.info("Demo history replayed: {} meetings, {} of them past", steps.size(), past);
		steps.clear();
	}
}
