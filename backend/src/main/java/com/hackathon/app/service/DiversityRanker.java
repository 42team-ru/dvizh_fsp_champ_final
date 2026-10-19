package com.hackathon.app.service;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.ToDoubleBiFunction;

/**
 * Разнообразие выдачи — Maximal Marginal Relevance: на каждую позицию берём кандидата с наибольшим
 * λ·оценка − (1−λ)·max похожести на уже выбранных. Так в топе не десять футболов одного клуба подряд.
 * Каждая N-я позиция — слот «Попробуйте новое»: лучший по оценке без вида спорта среди новых для человека видов.
 */
final class DiversityRanker {

	private DiversityRanker() {
	}

	/** Выбранный кандидат и пометка «слот нового». */
	record Ranked(EventScorer.Scored scored, boolean discovery) {
	}

	/** Порядок по умолчанию: оценка, затем раньше начинается, затем id — чтобы выдача не прыгала. */
	static final Comparator<EventScorer.Scored> BY_SCORE = Comparator
			.comparingDouble(EventScorer.Scored::score).reversed()
			.thenComparing(s -> s.candidate().startAt())
			.thenComparing(s -> s.candidate().event().getId());

	/**
	 * Первые needed позиций.
	 *
	 * @param discoveryEvery каждая такая позиция (5 → 5-я, 10-я…) — слот нового; 0 — без слотов
	 */
	static List<Ranked> rank(List<EventScorer.Scored> eligible, int needed, double lambda, int discoveryEvery,
			ToDoubleBiFunction<EventScorer.Scored, EventScorer.Scored> similarity) {
		var remaining = new ArrayList<>(eligible);
		remaining.sort(BY_SCORE);
		// наибольшая похожесть каждого оставшегося на уже выбранные; обновляется после каждого выбора
		var maxSimilarity = new double[remaining.size()];
		var taken = new boolean[remaining.size()];
		var result = new ArrayList<Ranked>();
		int limit = Math.min(needed, remaining.size());
		while (result.size() < limit) {
			int position = result.size() + 1;
			int pick = -1;
			boolean discovery = false;
			if (discoveryEvery > 0 && position % discoveryEvery == 0) {
				pick = bestDiscovery(remaining, taken);
				discovery = pick >= 0;
			}
			if (pick < 0) {
				double best = Double.NEGATIVE_INFINITY;
				for (int i = 0; i < remaining.size(); i++) {
					if (taken[i]) {
						continue;
					}
					var value = lambda * remaining.get(i).score() - (1 - lambda) * maxSimilarity[i];
					if (value > best) {
						best = value;
						pick = i;
					}
				}
			}
			taken[pick] = true;
			var chosen = remaining.get(pick);
			result.add(new Ranked(chosen, discovery));
			for (int i = 0; i < remaining.size(); i++) {
				if (!taken[i]) {
					maxSimilarity[i] = Math.max(maxSimilarity[i], similarity.applyAsDouble(remaining.get(i), chosen));
				}
			}
		}
		return result;
	}

	/**
	 * Похожесть двух мероприятий в выдаче: 0.6 — тот же вид спорта, 0.3 — тот же организатор, 0.1 — тот же день,
	 * ещё 0.4 — одинаковое название (разные клубы проводят «Онлайн-турнир по рапиду»); не больше 1.
	 */
	static ToDoubleBiFunction<EventScorer.Scored, EventScorer.Scored> feedSimilarity(ZoneId zone) {
		return (a, b) -> {
			var ca = a.candidate();
			var cb = b.candidate();
			double value = 0;
			if (ca.event().getSportId().equals(cb.event().getSportId())) {
				value += 0.6;
			}
			if (ca.organizerKey().equals(cb.organizerKey())) {
				value += 0.3;
			}
			if (ca.startAt().atZone(zone).toLocalDate().equals(cb.startAt().atZone(zone).toLocalDate())) {
				value += 0.1;
			}
			if (ca.event().getTitle().trim().equalsIgnoreCase(cb.event().getTitle().trim())) {
				value += 0.4;
			}
			return Math.min(1, value);
		};
	}

	private static int bestDiscovery(List<EventScorer.Scored> remaining, boolean[] taken) {
		int pick = -1;
		double best = 0;
		for (int i = 0; i < remaining.size(); i++) {
			var scored = remaining.get(i);
			if (!taken[i] && scored.newSport() && scored.discoveryScore() > best) {
				best = scored.discoveryScore();
				pick = i;
			}
		}
		return pick;
	}
}
