package com.hackathon.app.util;

import java.util.Map;
import java.util.Set;

import lombok.experimental.UtilityClass;

/** Формулы подбора: затухание, ядра, сглаживание и меры похожести. Все результаты — в [0, 1], если не сказано иное. */
@UtilityClass
public class RecommendationMath {

	/** Экспоненциальное затухание: через halfLife вес вдвое меньше. age < 0 (будущее) считается как 0. */
	public static double decay(double age, double halfLife) {
		return Math.pow(2, -Math.max(0, age) / halfLife);
	}

	/** Гауссово ядро с половиной на радиусе: 1 в нуле, 0.5 при d = radius, быстро к нулю дальше. */
	public static double gaussian(double distance, double radius) {
		var ratio = distance / radius;
		return Math.pow(2, -ratio * ratio);
	}

	/** Насыщение 1 − e^(−x/k): первые единицы дают много, дальше прибавка всё меньше. */
	public static double saturate(double x, double k) {
		return x <= 0 ? 0 : 1 - Math.exp(-x / k);
	}

	/** Сжатие к нулю на малых выборках: value · n / (n + prior). При n ≫ prior почти не меняет value. */
	public static double shrink(double value, double n, double prior) {
		return n <= 0 ? 0 : value * n / (n + prior);
	}

	/** Косинус двух разреженных неотрицательных векторов. */
	public static <K> double cosine(Map<K, Double> a, Map<K, Double> b) {
		if (a.isEmpty() || b.isEmpty()) {
			return 0;
		}
		var small = a.size() <= b.size() ? a : b;
		var large = small == a ? b : a;
		double dot = 0;
		for (var entry : small.entrySet()) {
			var other = large.get(entry.getKey());
			if (other != null) {
				dot += entry.getValue() * other;
			}
		}
		return dot == 0 ? 0 : dot / (norm(a) * norm(b));
	}

	/** Сколько общих элементов у двух множеств. */
	public static <K> int intersection(Set<K> a, Set<K> b) {
		var small = a.size() <= b.size() ? a : b;
		var large = small == a ? b : a;
		int count = 0;
		for (var item : small) {
			if (large.contains(item)) {
				count++;
			}
		}
		return count;
	}

	/** Мера Жаккара |A∩B| / |A∪B|. */
	public static <K> double jaccard(Set<K> a, Set<K> b) {
		if (a.isEmpty() || b.isEmpty()) {
			return 0;
		}
		int common = intersection(a, b);
		return common == 0 ? 0 : (double) common / (a.size() + b.size() - common);
	}

	/** Расстояние по кругу (например, часы недели 0–167): min(|a−b|, period − |a−b|). */
	public static double circularDistance(double a, double b, double period) {
		var diff = Math.abs(a - b) % period;
		return Math.min(diff, period - diff);
	}

	/** Ограничить [0, 1]. */
	public static double clamp01(double value) {
		return Math.max(0, Math.min(1, value));
	}

	/** Округлить до сотых — для ответа API. */
	public static double round2(double value) {
		return Math.round(value * 100) / 100.0;
	}

	private static <K> double norm(Map<K, Double> vector) {
		double sum = 0;
		for (var value : vector.values()) {
			sum += value * value;
		}
		return Math.sqrt(sum);
	}
}
