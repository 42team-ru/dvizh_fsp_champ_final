package com.hackathon.app.demo;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.entity.AuditEntity;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

/**
 * Единственный «обман» демо-режима — время. Сервисы не дают создать прошедшую встречу или запись из прошлого, поэтому
 * демо создаёт всё обычными сервисами с допустимыми (будущими) датами, а затем этот репозиторий переносит метки времени
 * в прошлое. Здесь только даты и служебный код организации: статусы, деньги, достижения и награды сюда не попадают.
 * Bulk-update JPQL обходит генераторы Hibernate (@CreationTimestamp ставит «сейчас») и пишет дату как есть.
 */
@Repository
@RequiredArgsConstructor
@Transactional
class DemoDataRepository {

	private final EntityManager em;

	/** createdAt и updatedAt записи → at. */
	void backdate(Class<? extends AuditEntity> entity, UUID id, Instant at) {
		em.createQuery("update " + entity.getSimpleName() + " e set e.createdAt = :at, e.updatedAt = :at where e.id = :id")
				.setParameter("at", at)
				.setParameter("id", id)
				.executeUpdate();
	}

	/** Дата регистрации аккаунта. */
	void backdateUser(UUID id, Instant at) {
		em.createQuery("update AppUser u set u.createdAt = :at where u.id = :id")
				.setParameter("at", at)
				.setParameter("id", id)
				.executeUpdate();
	}

	/** Анкета подана и рассмотрена в прошлом; reviewedAt = null — ещё на проверке. */
	void backdateOrganization(UUID id, Instant submittedAt, Instant reviewedAt) {
		em.createQuery("""
						update Organization o set o.createdAt = :submittedAt, o.submittedAt = :submittedAt,
							o.updatedAt = :updatedAt
						where o.id = :id""")
				.setParameter("submittedAt", submittedAt)
				.setParameter("updatedAt", reviewedAt != null ? reviewedAt : submittedAt)
				.setParameter("id", id)
				.executeUpdate();
		if (reviewedAt != null) { // у заявки на проверке reviewedAt и так null
			em.createQuery("update Organization o set o.reviewedAt = :reviewedAt where o.id = :id")
					.setParameter("reviewedAt", reviewedAt)
					.setParameter("id", id)
					.executeUpdate();
		}
	}

	/**
	 * Служебный код организации («Хищные бобры» узнаются по нему). Через API кода нет: его задаёт только тот, кто
	 * разворачивает базу, поэтому и демо выставляет его здесь, а не обходным путём через сервисы.
	 */
	void assignOrganizationCode(UUID organizationId, String code) {
		em.createQuery("update Organization o set o.code = :code where o.id = :id")
				.setParameter("code", code)
				.setParameter("id", organizationId)
				.executeUpdate();
	}

	/** Разовое мероприятие целиком переезжает во времени: оно само и его единственное занятие. */
	void moveEvent(UUID eventId, Instant createdAt, Instant startAt, Instant endAt) {
		em.createQuery("""
						update Event e set e.createdAt = :createdAt, e.updatedAt = :createdAt,
							e.startAt = :startAt, e.endAt = :endAt where e.id = :id""")
				.setParameter("createdAt", createdAt)
				.setParameter("startAt", startAt)
				.setParameter("endAt", endAt)
				.setParameter("id", eventId)
				.executeUpdate();
		em.createQuery("""
						update EventOccurrence o set o.createdAt = :createdAt, o.updatedAt = :createdAt,
							o.startAt = :startAt, o.endAt = :endAt where o.eventId = :id""")
				.setParameter("createdAt", createdAt)
				.setParameter("startAt", startAt)
				.setParameter("endAt", endAt)
				.setParameter("id", eventId)
				.executeUpdate();
	}

	/** Мероприятие создано раньше, чем «сейчас» (будущее мероприятие, опубликованное несколько дней назад). */
	void backdateEvent(UUID eventId, Instant createdAt) {
		backdate(com.hackathon.app.domain.entity.Event.class, eventId, createdAt);
	}

	/** Когда админ снял или удалил мероприятие. */
	void backdateModeration(UUID eventId, Instant at) {
		em.createQuery("update Event e set e.moderatedAt = :at where e.id = :id")
				.setParameter("at", at)
				.setParameter("id", eventId)
				.executeUpdate();
	}

	/** Запись или заявка подана в createdAt; решение (подтверждение, отказ, отмена), если оно было, принято в decidedAt. */
	void backdateRegistration(UUID id, Instant createdAt, Instant decidedAt) {
		var query = decidedAt == null
				? em.createQuery("update Registration r set r.createdAt = :createdAt, r.updatedAt = :createdAt where r.id = :id")
				: em.createQuery("""
						update Registration r set r.createdAt = :createdAt, r.updatedAt = :decidedAt, r.decidedAt = :decidedAt
						where r.id = :id""").setParameter("decidedAt", decidedAt);
		query.setParameter("createdAt", createdAt).setParameter("id", id).executeUpdate();
	}

	/** Сообщение написано в createdAt; правка и удаление (если были, не null) — позже. */
	void backdateComment(UUID id, Instant createdAt, Instant editedAt, Instant deletedAt) {
		var jpql = new StringBuilder("update Comment c set c.createdAt = :createdAt, c.updatedAt = :createdAt");
		if (editedAt != null) {
			jpql.append(", c.editedAt = :editedAt");
		}
		if (deletedAt != null) {
			jpql.append(", c.deletedAt = :deletedAt");
		}
		var query = em.createQuery(jpql.append(" where c.id = :id").toString())
				.setParameter("createdAt", createdAt).setParameter("id", id);
		if (editedAt != null) {
			query.setParameter("editedAt", editedAt);
		}
		if (deletedAt != null) {
			query.setParameter("deletedAt", deletedAt);
		}
		query.executeUpdate();
	}

	/** Соорганизатор добавлен в at. */
	void backdateOrganizer(UUID eventId, UUID userId, Instant at) {
		em.createQuery("update EventOrganizer o set o.createdAt = :at, o.updatedAt = :at where o.eventId = :eventId and o.userId = :userId")
				.setParameter("at", at)
				.setParameter("eventId", eventId)
				.setParameter("userId", userId)
				.executeUpdate();
	}

	/**
	 * Строки, которые настоящая обработка только что создала (монеты, достижения, вехи организаций), получают дату
	 * конца встречи, за которую начислены: история в профиле показывает реальные даты. Суммы и сами строки не трогаем.
	 */
	void stampEconomy(Instant since, Instant at) {
		em.createQuery("""
						update CoinLedgerEntry e set e.createdAt = :at, e.updatedAt = :at,
							e.occurredAt = case when e.occurredAt > :at then :at else e.occurredAt end
						where e.createdAt >= :since""")
				.setParameter("at", at)
				.setParameter("since", since)
				.executeUpdate();
		em.createQuery("update UserAchievement a set a.createdAt = :at, a.updatedAt = :at where a.createdAt >= :since")
				.setParameter("at", at)
				.setParameter("since", since)
				.executeUpdate();
		em.createQuery("""
						update OrganizationAward w set w.createdAt = :at, w.updatedAt = :at, w.confirmedAt = :at
						where w.createdAt >= :since""")
				.setParameter("at", at)
				.setParameter("since", since)
				.executeUpdate();
	}

	/** Предложение «Организации месяца» сделано в at (в первый день месяца), а не в момент старта демо. */
	void backdateAward(UUID id, Instant at) {
		backdate(com.hackathon.app.domain.entity.OrganizationAward.class, id, at);
	}

	/** Тысячи операций в одной транзакции: сбрасываем контекст, иначе каждый flush перепроверяет все сущности. */
	void flushAndClear() {
		em.flush();
		em.clear();
	}
}
