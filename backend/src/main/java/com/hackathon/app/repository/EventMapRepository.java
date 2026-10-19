package com.hackathon.app.repository;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.JoinMode;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Поиск мероприятий в видимой области карты на PostGIS. Колонка events.location (точка из lat/lon) вычисляется
 * базой и в сущности не замаплена, поэтому запрос нативный. Работает только на Postgres с PostGIS:
 * тесты карты идут с тегом postgres.
 * <p>
 * Фильтры повторяют {@link EventSpecifications#feed}: меняешь одно — поменяй и другое.
 */
@Repository
@RequiredArgsConstructor
public class EventMapRepository {

	private final JdbcClient jdbc;

	/**
	 * id опубликованных очных мероприятий, у которых точка внутри области и начало в [from, to], ближайшие первыми.
	 * minLon больше maxLon — область пересекает 180-й меридиан, ищем в двух прямоугольниках.
	 * Null-фильтры не применяются.
	 */
	public List<UUID> findIdsInArea(double minLon, double minLat, double maxLon, double maxLat, Instant from,
			Instant to, String searchText, UUID sportId, EventLevel level, JoinMode joinMode, int limit) {
		var sql = new StringBuilder("""
				select e.id from events e
				where e.status = 'PUBLISHED' and e.format = 'OFFLINE'
				  and e.start_at >= :from and e.start_at <= :to
				""");
		if (minLon <= maxLon) {
			sql.append(" and e.location && ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326)");
		} else {
			sql.append("""
					 and (e.location && ST_MakeEnvelope(:minLon, :minLat, 180, :maxLat, 4326)
					   or e.location && ST_MakeEnvelope(-180, :minLat, :maxLon, :maxLat, 4326))""");
		}
		if (searchText != null) {
			sql.append(" and (lower(e.title) like :pattern or lower(e.description) like :pattern)");
		}
		if (sportId != null) {
			sql.append(" and e.sport_id = :sportId");
		}
		if (level != null) {
			sql.append(" and e.level in (:level, 'ANY')");
		}
		if (joinMode != null) {
			sql.append(" and e.join_mode = :joinMode");
		}
		sql.append(" order by e.start_at, e.id limit :limit");

		var statement = jdbc.sql(sql.toString())
				.param("minLon", minLon)
				.param("minLat", minLat)
				.param("maxLon", maxLon)
				.param("maxLat", maxLat)
				// pgjdbc не принимает Instant напрямую
				.param("from", from.atOffset(ZoneOffset.UTC))
				.param("to", to.atOffset(ZoneOffset.UTC))
				.param("limit", limit);
		if (searchText != null) {
			statement = statement.param("pattern", "%" + searchText.toLowerCase(Locale.ROOT) + "%");
		}
		if (sportId != null) {
			statement = statement.param("sportId", sportId);
		}
		if (level != null) {
			statement = statement.param("level", level.name());
		}
		if (joinMode != null) {
			statement = statement.param("joinMode", joinMode.name());
		}
		return statement.query(UUID.class).list();
	}
}
