package com.hackathon.app.repository;

import java.util.ArrayList;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import com.hackathon.app.domain.enums.OrganizationStatus;
import jakarta.persistence.criteria.CommonAbstractCriteria;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.experimental.UtilityClass;
import org.springframework.data.jpa.domain.Specification;

/**
 * Фильтры ленты на Criteria API: условия на само мероприятие. Период по датам проверяется по занятиям
 * в {@link EventFeedRepository}. Те же фильтры для карты — в {@link EventMapRepository}: меняешь одно — поменяй и другое.
 */
@UtilityClass
public class EventSpecifications {

	/** Километров в одном градусе широты: для прямоугольника «рядом» вокруг точки. */
	private static final double KM_PER_DEGREE = 111.0;

	/** Точка и радиус фильтра «рядом»; онлайн-мероприятия проходят всегда — они доступны откуда угодно. */
	public record Near(double lat, double lon, int radiusKm) {
	}

	/**
	 * Только опубликованные и видимые (у организации — только одобренной); null-фильтры не применяются.
	 * Фильтр level строгий (ANY — отдельное значение «Любой»). searchText ищет в названии, описании, адресе, виде спорта
	 * и названии организации. mySports — лента «Для меня»: вид спорта → уровень пользователя (null — любой);
	 * пустая карта ничего не пропускает. near — прямоугольник вокруг точки (переносимо, без PostGIS).
	 */
	public Specification<Event> feed(String searchText, UUID sportId, EventLevel level, JoinMode joinMode,
			EventFormat format, UUID organizationId, Map<UUID, EventLevel> mySports, Near near) {
		return (root, query, criteria) -> {
			var conditions = new ArrayList<Predicate>();
			conditions.add(criteria.equal(root.get("status"), EventStatus.PUBLISHED));
			conditions.add(visibleOrganization(root, query, criteria));
			if (searchText != null) {
				conditions.add(textMatches(root, query, criteria, searchText));
			}
			if (sportId != null) {
				conditions.add(criteria.equal(root.get("sportId"), sportId));
			}
			if (level != null) {
				// фильтр уровня строгий: «Новичок» — только встречи для новичков (уровень «Любой» выбирается отдельно)
				conditions.add(criteria.equal(root.get("level"), level));
			}
			if (joinMode != null) {
				conditions.add(criteria.equal(root.get("joinMode"), joinMode));
			}
			if (organizationId != null) {
				conditions.add(criteria.equal(root.get("organizationId"), organizationId));
			}
			if (format != null) {
				conditions.add(criteria.equal(root.get("format"), format));
			}
			if (mySports != null) {
				var matches = new ArrayList<Predicate>();
				mySports.forEach((mySportId, myLevel) -> matches.add(myLevel == null
						? criteria.equal(root.get("sportId"), mySportId)
						: criteria.and(criteria.equal(root.get("sportId"), mySportId),
								root.get("level").in(myLevel, EventLevel.ANY))));
				conditions.add(matches.isEmpty() ? criteria.disjunction() : criteria.or(matches.toArray(Predicate[]::new)));
			}
			if (near != null) {
				conditions.add(near(root, criteria, near));
			}
			return criteria.and(conditions.toArray(Predicate[]::new));
		};
	}

	/** Опубликованные и видимые мероприятия автора — для его публичного профиля. */
	public Specification<Event> publishedByAuthor(UUID authorId) {
		return (root, query, criteria) -> criteria.and(criteria.equal(root.get("status"), EventStatus.PUBLISHED),
				criteria.equal(root.get("authorId"), authorId), visibleOrganization(root, query, criteria));
	}

	/**
	 * Мероприятие от частного лица или от организации, которая сейчас допущена. Если админ отозвал одобрение,
	 * её мероприятия пропадают из выдачи; при повторном одобрении возвращаются сами.
	 */
	private Predicate visibleOrganization(Root<Event> root, CommonAbstractCriteria query, CriteriaBuilder criteria) {
		var approved = query.subquery(UUID.class);
		var organization = approved.from(Organization.class);
		approved.select(organization.get("id")).where(criteria.equal(organization.get("id"), root.get("organizationId")),
				criteria.equal(organization.get("status"), OrganizationStatus.APPROVED));
		return criteria.or(criteria.isNull(root.get("organizationId")), criteria.exists(approved));
	}

	/** Поиск без учёта регистра по названию, описанию, адресу, виду спорта (ё = е) и названию организации. */
	private Predicate textMatches(Root<Event> root, CommonAbstractCriteria query, CriteriaBuilder criteria,
			String searchText) {
		var lower = searchText.toLowerCase(Locale.ROOT);
		var pattern = "%" + lower + "%";
		var sportPattern = "%" + lower.replace('ё', 'е') + "%";
		var sport = query.subquery(UUID.class);
		var sportRoot = sport.from(Sport.class);
		sport.select(sportRoot.get("id")).where(criteria.equal(sportRoot.get("id"), root.get("sportId")),
				criteria.like(sportRoot.get("normalizedName"), sportPattern));
		var organization = query.subquery(UUID.class);
		var organizationRoot = organization.from(Organization.class);
		organization.select(organizationRoot.get("id")).where(
				criteria.equal(organizationRoot.get("id"), root.get("organizationId")),
				criteria.like(criteria.lower(organizationRoot.get("name")), pattern));
		return criteria.or(criteria.like(criteria.lower(root.get("title")), pattern),
				criteria.like(criteria.lower(root.get("description")), pattern),
				criteria.like(criteria.lower(root.get("address")), pattern),
				criteria.exists(sport), criteria.exists(organization));
	}

	/** Прямоугольник ±radius вокруг точки; долгота растягивается к полюсам. Онлайн проходит всегда. */
	private Predicate near(Root<Event> root, CriteriaBuilder criteria, Near near) {
		double dLat = near.radiusKm() / KM_PER_DEGREE;
		double dLon = near.radiusKm() / (KM_PER_DEGREE * Math.max(0.01, Math.cos(Math.toRadians(near.lat()))));
		return criteria.or(criteria.equal(root.get("format"), EventFormat.ONLINE),
				criteria.and(criteria.between(root.get("lat"), near.lat() - dLat, near.lat() + dLat),
						criteria.between(root.get("lon"), near.lon() - dLon, near.lon() + dLon)));
	}
}
