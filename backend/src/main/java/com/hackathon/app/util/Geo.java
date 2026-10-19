package com.hackathon.app.util;

import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import lombok.experimental.UtilityClass;

/** География без PostGIS: расстояние по сфере, медианная точка и часовой пояс по координатам. */
@UtilityClass
public class Geo {

	private static final double EARTH_RADIUS_KM = 6371.0088;

	/** Точка на карте. */
	public record Point(double lat, double lon) {
	}

	/** Крупный город и его пояс: пояс разового мероприятия берём по ближайшему городу. */
	private record City(double lat, double lon, ZoneId zone) {
	}

	private static final List<City> CITIES = List.of(
			city(55.7558, 37.6173, "Europe/Moscow"), city(59.9343, 30.3351, "Europe/Moscow"),
			city(55.7887, 49.1221, "Europe/Moscow"), city(56.3269, 44.0059, "Europe/Moscow"),
			city(45.0355, 38.9753, "Europe/Moscow"), city(43.5855, 39.7231, "Europe/Moscow"),
			city(54.7104, 20.4522, "Europe/Kaliningrad"), city(53.1959, 50.1002, "Europe/Samara"),
			city(56.8389, 60.6057, "Asia/Yekaterinburg"), city(58.0105, 56.2502, "Asia/Yekaterinburg"),
			city(54.9885, 73.3242, "Asia/Omsk"), city(55.0084, 82.9357, "Asia/Novosibirsk"),
			city(56.0153, 92.8932, "Asia/Krasnoyarsk"), city(52.2870, 104.3050, "Asia/Irkutsk"),
			city(48.4802, 135.0719, "Asia/Vladivostok"), city(43.1155, 131.8855, "Asia/Vladivostok"),
			city(62.0355, 129.6755, "Asia/Yakutsk"));

	/** Расстояние по большому кругу (гаверсинус), км. */
	public static double haversineKm(double lat1, double lon1, double lat2, double lon2) {
		double dLat = Math.toRadians(lat2 - lat1);
		double dLon = Math.toRadians(lon2 - lon1);
		double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
		return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
	}

	/** Расстояние между точками, км. */
	public static double distanceKm(Point a, Point b) {
		return haversineKm(a.lat(), a.lon(), b.lat(), b.lon());
	}

	/** Покоординатная медиана: устойчива к одной поездке в другой город. null — точек нет. */
	public static Point median(List<Point> points) {
		if (points.isEmpty()) {
			return null;
		}
		var lats = new ArrayList<Double>();
		var lons = new ArrayList<Double>();
		points.forEach(point -> {
			lats.add(point.lat());
			lons.add(point.lon());
		});
		return new Point(medianOf(lats), medianOf(lons));
	}

	/** Пояс ближайшего крупного города; дальше 800 км ото всех — fallback. */
	public static ZoneId zoneNear(Double lat, Double lon, ZoneId fallback) {
		if (lat == null || lon == null) {
			return fallback;
		}
		City best = null;
		double bestDistance = Double.MAX_VALUE;
		for (var city : CITIES) {
			var distance = haversineKm(lat, lon, city.lat(), city.lon());
			if (distance < bestDistance) {
				bestDistance = distance;
				best = city;
			}
		}
		return best != null && bestDistance < 800 ? best.zone() : fallback;
	}

	private static double medianOf(List<Double> values) {
		values.sort(Double::compare);
		int middle = values.size() / 2;
		return values.size() % 2 == 1 ? values.get(middle) : (values.get(middle - 1) + values.get(middle)) / 2;
	}

	private static City city(double lat, double lon, String zone) {
		return new City(lat, lon, ZoneId.of(zone));
	}
}
