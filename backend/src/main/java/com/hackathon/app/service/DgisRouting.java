package com.hackathon.app.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.StreamSupport;

import com.hackathon.app.config.RoutingProperties;
import com.hackathon.app.domain.enums.TravelMode;
import com.hackathon.app.util.Geo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Маршруты 2ГИС через JDK HTTP: пешком и на машине — Routing API, на автобусе — Public Transport API
 * на время выхода (учитывает расписание). Ключ не попадает в логи; любая ошибка — пустой результат, и
 * вызывающий берёт оценку по расстоянию. Ответы кешируются в памяти на {@code cacheMinutes}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DgisRouting {

	/** Ожидание транспорта дольше этого — считаем, что в это время он не ходит. */
	private static final int MAX_WAIT_MINUTES = 30;
	private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

	/** Маршрут одним способом: минуты, ходит ли транспорт и пояснение. */
	public record Route(int minutes, boolean available, String note) {}

	private record Cached(Optional<Route> route, Instant expiresAt) {}

	private final RoutingProperties properties;
	private final ObjectMapper json;
	private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
	private final Map<String, Cached> cache = new ConcurrentHashMap<>();

	public boolean enabled() {
		return properties.enabled();
	}

	/**
	 * Маршрут от дома до места; {@code departAt} — когда выходить (важно для расписания транспорта),
	 * {@code zone} — пояс для «первый рейс в 05:57».
	 */
	public Optional<Route> route(TravelMode mode, Geo.Point from, Geo.Point to, Instant departAt, ZoneId zone) {
		if (!properties.enabled() || mode == TravelMode.NONE) return Optional.empty();
		// время выхода в ключе округляем до 15 минут: расписание внутри интервала почти не меняется
		var key = "%s:%.4f,%.4f:%.4f,%.4f:%d".formatted(mode, from.lat(), from.lon(), to.lat(), to.lon(),
				mode == TravelMode.BUS ? departAt.getEpochSecond() / 900 : 0);
		var now = Instant.now();
		var hit = cache.get(key);
		if (hit != null && hit.expiresAt().isAfter(now)) return hit.route();
		Optional<Route> route;
		try {
			route = mode == TravelMode.BUS ? transit(from, to, departAt, zone) : street(mode, from, to);
		} catch (Exception failure) {
			log.warn("2GIS routing failed: mode={}, errorType={}", mode, failure.getClass().getSimpleName());
			route = Optional.empty();
		}
		cache.put(key, new Cached(route, now.plus(Duration.ofMinutes(properties.cacheMinutes()))));
		if (cache.size() > 5000) cache.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));
		return route;
	}

	private Optional<Route> street(TravelMode mode, Geo.Point from, Geo.Point to) throws Exception {
		var body = json.createObjectNode();
		var points = body.putArray("points");
		for (var p : List.of(from, to)) points.addObject().put("type", "stop").put("lat", p.lat()).put("lon", p.lon());
		body.put("transport", mode == TravelMode.CAR ? "driving" : "walking");
		body.put("output", "summary");
		var answer = post("/routing/7.0.0/global", body.toString());
		var result = answer.path("result");
		if (!"OK".equals(answer.path("status").asString()) || result.isEmpty()) return Optional.empty();
		return Optional.of(new Route(minutes(result.get(0).path("duration").asInt()), true, null));
	}

	/** Самый быстрый вариант с транспортом; пешие варианты из ответа пропускаем. */
	private Optional<Route> transit(Geo.Point from, Geo.Point to, Instant departAt, ZoneId zone) throws Exception {
		var body = json.createObjectNode();
		body.putObject("source").putObject("point").put("lat", from.lat()).put("lon", from.lon());
		body.putObject("target").putObject("point").put("lat", to.lat()).put("lon", to.lon());
		var transport = body.putArray("transport");
		for (var t : List.of("bus", "tram", "trolleybus", "shuttle_bus", "metro")) transport.add(t);
		body.put("start_time", departAt.getEpochSecond());
		body.put("locale", "ru");
		var answer = post("/public_transport/2.0", body.toString());
		if (!answer.isArray()) return Optional.empty();
		JsonNode best = null;
		for (var route : answer) {
			if (route.path("pedestrian").asBoolean()) continue;
			if (best == null || route.path("total_duration").asInt() < best.path("total_duration").asInt()) best = route;
		}
		if (best == null) return Optional.of(new Route(0, false, "рядом нет маршрутов"));
		int waiting = StreamSupport.stream(best.path("movements").spliterator(), false)
				.mapToInt(m -> m.path("waiting_duration").asInt()).sum() / 60;
		// begin_trips / finish_trips — рейсы ещё не начались или уже закончились: на это время транспорт не ходит
		var pause = StreamSupport.stream(best.path("schedules_events").spliterator(), false)
				.filter(e -> e.path("type").asString().endsWith("_trips")).findFirst();
		if (pause.isPresent() || waiting > MAX_WAIT_MINUTES) {
			var event = pause.orElse(null);
			String note = event != null && "begin_trips".equals(event.path("type").asString())
					? "первый рейс в " + HH_MM.format(Instant.ofEpochSecond(event.path("start_time_utc").asLong()).atZone(zone))
					: "в это время не ходит";
			return Optional.of(new Route(minutes(best.path("total_duration").asInt()), false, note));
		}
		return Optional.of(new Route(minutes(best.path("total_duration").asInt()), true, routeNames(best)));
	}

	/** «№ 12, 15, 49»: первые номера маршрутов на посадке. */
	private static String routeNames(JsonNode route) {
		var names = new LinkedHashSet<String>();
		for (var waypoint : route.path("waypoints")) {
			for (var name : waypoint.path("routes_names")) names.add(name.asString());
			if (!names.isEmpty()) break;
		}
		var first = new ArrayList<>(names).subList(0, Math.min(3, names.size()));
		return first.isEmpty() ? null : "№ " + String.join(", ", first);
	}

	private JsonNode post(String path, String body) throws Exception {
		var request = HttpRequest.newBuilder(URI.create(properties.apiUrl() + path + "?key=" + properties.dgisKey()))
				.timeout(Duration.ofSeconds(5))
				.header("Content-Type", "application/json")
				.POST(HttpRequest.BodyPublishers.ofString(body))
				.build();
		var response = client.send(request, HttpResponse.BodyHandlers.ofString());
		if (response.statusCode() != 200) throw new IllegalStateException("HTTP " + response.statusCode());
		return json.readTree(response.body());
	}

	private static int minutes(int seconds) {
		return Math.max(1, (int) Math.ceil(seconds / 60.0));
	}
}
