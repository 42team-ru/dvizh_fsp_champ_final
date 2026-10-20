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
	 * id опубликованных и видимых (организация одобрена) очных мероприятий, у которых точка внутри области и хоть одно занятие (SCHEDULED) начинается
	 * в [from, to]; серия — одна точка. Ближайшие (по подходящему занятию) первыми.
	 * minLon больше maxLon — область пересекает 180-й меридиан, ищем в двух прямоугольниках.
	 * Null-фильтры не применяются. forUserId — лента «Для меня»: виды спорта из профиля этого пользователя
	 * и уровень мероприятия «Любой» или как у него (уровень не указан — любой). organizationId — только события организации.
	 * near — тот же прямоугольник вокруг центра города, что в ленте; null — все города.
	 */
	public List<UUID> findIdsInArea(double minLon, double minLat, double maxLon, double maxLat, Instant from,
			Instant to, String searchText, UUID sportId, EventLevel level, JoinMode joinMode, UUID forUserId, UUID organizationId,
			EventSpecifications.Near near, int limit) {
		var sql = new StringBuilder("""
				select e.id from events e
				join event_occurrences o on o.event_id = e.id
				  and o.status = 'SCHEDULED' and o.start_at >= :from and o.start_at <= :to
				where e.status = 'PUBLISHED' and e.format = 'OFFLINE'
				  and (e.organization_id is null or exists (select 1 from organizations org
				    where org.id = e.organization_id and org.status = 'APPROVED'))
				""");
		if (minLon <= maxLon) {
			sql.append(" and e.location && ST_MakeEnvelope(:minLon, :minLat, :maxLon, :maxLat, 4326)");
		} else {
			sql.append("""
					 and (e.location && ST_MakeEnvelope(:minLon, :minLat, 180, :maxLat, 4326)
					   or e.location && ST_MakeEnvelope(-180, :minLat, :maxLon, :maxLat, 4326))""");
		}
		if (searchText != null) {
			sql.append("""
					 and (lower(e.title) like :pattern or lower(e.description) like :pattern
					   or lower(e.address) like :pattern
					   or exists (select 1 from sports s where s.id = e.sport_id and s.normalized_name like :sportPattern)
					   or exists (select 1 from organizations so where so.id = e.organization_id
					     and lower(so.name) like :pattern))""");
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
		if (organizationId != null) {
			sql.append(" and e.organization_id = :organizationId");
		}
		if (forUserId != null) {
			sql.append("""
					 and exists (select 1 from user_sports us where us.user_id = :forUserId and us.sport_id = e.sport_id
					   and (us.level is null or e.level = 'ANY' or e.level = us.level))""");
		}
		if (near != null) {
			sql.append(" and e.lat between :nearMinLat and :nearMaxLat and e.lon between :nearMinLon and :nearMaxLon");
		}
		sql.append(" group by e.id order by min(o.start_at), e.id limit :limit");

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
			var lower = searchText.toLowerCase(Locale.ROOT);
			statement = statement.param("pattern", "%" + lower + "%")
					.param("sportPattern", "%" + lower.replace('ё', 'е') + "%");
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
		if (organizationId != null) {
			statement = statement.param("organizationId", organizationId);
		}
		if (forUserId != null) {
			statement = statement.param("forUserId", forUserId);
		}
		if (near != null) {
			double dLat = near.radiusKm() / 111.0;
			double dLon = near.radiusKm() / (111.0 * Math.max(0.01, Math.cos(Math.toRadians(near.lat()))));
			statement = statement.param("nearMinLat", near.lat() - dLat).param("nearMaxLat", near.lat() + dLat)
					.param("nearMinLon", near.lon() - dLon).param("nearMaxLon", near.lon() + dLon);
		}
		return statement.query(UUID.class).list();
	}
}
