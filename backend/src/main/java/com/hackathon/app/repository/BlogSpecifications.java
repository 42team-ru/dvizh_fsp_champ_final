package com.hackathon.app.repository;

import java.util.Locale;
import java.util.UUID;

import com.hackathon.app.domain.entity.BlogPost;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.enums.BlogPostStatus;
import com.hackathon.app.domain.enums.BlogPostType;
import org.springframework.data.jpa.domain.Specification;

/** Фильтры блога, выполняемые до пагинации в БД. */
public final class BlogSpecifications {
	private BlogSpecifications() {}

	/**
	 * Опубликованные посты. organizationId — «блог клуба»: посты аккаунта организации (organizationAccountId)
	 * и посты о её встречах. Поиск — по заголовку и тексту без учёта регистра.
	 */
	public static Specification<BlogPost> feed(BlogPostType type, UUID sportId, UUID authorId, UUID eventId,
			UUID organizationId, UUID organizationAccountId, String searchText) {
		return (p, query, cb) -> {
			var organization = cb.conjunction();
			if (organizationId != null) {
				var orgEvents = query.subquery(UUID.class);
				var e = orgEvents.from(Event.class);
				orgEvents.select(e.get("id")).where(cb.equal(e.get("organizationId"), organizationId));
				organization = organizationAccountId == null
						? p.get("eventId").in(orgEvents)
						: cb.or(cb.equal(p.get("authorId"), organizationAccountId), p.get("eventId").in(orgEvents));
			}
			var text = searchText == null || searchText.isBlank() ? null
					: "%" + searchText.trim().toLowerCase(Locale.ROOT) + "%";
			return cb.and(cb.equal(p.get("status"), BlogPostStatus.PUBLISHED),
					type == null ? cb.conjunction() : cb.equal(p.get("type"), type),
					sportId == null ? cb.conjunction() : cb.equal(p.get("sportId"), sportId),
					authorId == null ? cb.conjunction() : cb.equal(p.get("authorId"), authorId),
					eventId == null ? cb.conjunction() : cb.equal(p.get("eventId"), eventId),
					organization,
					text == null ? cb.conjunction()
							: cb.or(cb.like(cb.lower(p.get("title")), text), cb.like(cb.lower(p.get("body")), text)));
		};
	}

	/** Мои посты: черновики и опубликованные. */
	public static Specification<BlogPost> mine(UUID authorId, BlogPostStatus status) {
		return (p, query, cb) -> cb.and(cb.equal(p.get("authorId"), authorId),
				status == null ? cb.conjunction() : cb.equal(p.get("status"), status));
	}
}
