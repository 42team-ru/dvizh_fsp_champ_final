package com.hackathon.app.util;

import java.util.LinkedHashMap;
import java.util.Map;

import com.hackathon.app.domain.enums.TravelMode;
import lombok.experimental.UtilityClass;

/**
 * Оценка дороги без карт: прямое расстояние × 1,3 на изгибы улиц, у каждого способа своя скорость и накладные минуты.
 * Точное время даёт маршрут 2ГИС в браузере; эта оценка — запасной вариант и значение по умолчанию.
 */
@UtilityClass
public class TravelEstimate {

	/** Во сколько раз путь по улицам длиннее прямой. */
	private static final double DETOUR = 1.3;
	/** Пешком дальше этого — по умолчанию предлагаем автобус. */
	public static final int WALK_LIMIT_MINUTES = 25;

	/** Минуты в пути по каждому способу: пешком, на автобусе, на машине. */
	public static Map<TravelMode, Integer> minutes(double distanceKm) {
		var km = distanceKm * DETOUR;
		var result = new LinkedHashMap<TravelMode, Integer>();
		result.put(TravelMode.WALK, roundUp(km / 5 * 60));
		// автобус: 20 км/ч и ожидание на остановке
		result.put(TravelMode.BUS, roundUp(km / 20 * 60 + 10));
		// машина: 30 км/ч по городу и парковка
		result.put(TravelMode.CAR, roundUp(km / 30 * 60 + 5));
		return result;
	}

	/** Пешком, если недалеко, иначе автобус. */
	public static TravelMode recommended(Map<TravelMode, Integer> minutes) {
		return minutes.get(TravelMode.WALK) <= WALK_LIMIT_MINUTES ? TravelMode.WALK : TravelMode.BUS;
	}

	/** Вверх до 5 минут, но не меньше 5. */
	private static int roundUp(double minutes) {
		return Math.max(5, (int) Math.ceil(minutes / 5) * 5);
	}
}
