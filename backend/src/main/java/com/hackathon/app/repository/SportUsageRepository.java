package com.hackathon.app.repository;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * Где используется вид спорта и как перенести всё это на другой вид при слиянии. Только JPQL — работает и на H2 в тестах.
 * Обновления не трогают updatedAt: сами мероприятия и интересы пользователей не менялись.
 */
@Repository
@RequiredArgsConstructor
public class SportUsageRepository {

	private final EntityManager em;

	/** Сколько мероприятий (в любом статусе) у каждого вида; видов без мероприятий в карте нет. */
	public Map<UUID, Long> eventCounts() {
		var counts = new HashMap<UUID, Long>();
		em.createQuery("select e.sportId, count(e) from Event e group by e.sportId", Tuple.class).getResultList()
				.forEach(row -> counts.put(row.get(0, UUID.class), row.get(1, Long.class)));
		return counts;
	}

	/** Сколько ссылок на вид в мероприятиях, интересах людей, анкетах организаций, скрытых подборках и слитых видах. */
	public long usages(UUID sportId) {
		return count("select count(e) from Event e where e.sportId = :id", sportId)
				+ count("select count(us) from UserSport us where us.sportId = :id", sportId)
				+ count("select count(os) from OrganizationSport os where os.sportId = :id", sportId)
				+ count("select count(d) from RecommendationDismissal d where d.sportId = :id", sportId)
				+ count("select count(s) from Sport s where s.mergedIntoId = :id", sportId);
	}

	/**
	 * Переносит всё, что ссылается на вид {@code from}, на вид {@code to}: мероприятия, интересы, анкеты организаций,
	 * «Не интересно» и ранее слитые в {@code from} виды. Дубли интересов и анкет (у человека уже есть {@code to}) удаляются.
	 */
	public void reassign(UUID from, UUID to) {
		em.createQuery("""
				delete from UserSport us where us.sportId = :from
				and exists (select 1 from UserSport t where t.userId = us.userId and t.sportId = :to)""")
				.setParameter("from", from).setParameter("to", to).executeUpdate();
		em.createQuery("""
				delete from OrganizationSport os where os.sportId = :from
				and exists (select 1 from OrganizationSport t where t.organizationId = os.organizationId and t.sportId = :to)""")
				.setParameter("from", from).setParameter("to", to).executeUpdate();
		for (var update : new String[] { "update Event x set x.sportId = :to where x.sportId = :from",
				"update UserSport x set x.sportId = :to where x.sportId = :from",
				"update OrganizationSport x set x.sportId = :to where x.sportId = :from",
				"update RecommendationDismissal x set x.sportId = :to where x.sportId = :from",
				"update Sport x set x.mergedIntoId = :to where x.mergedIntoId = :from" }) {
			em.createQuery(update).setParameter("from", from).setParameter("to", to).executeUpdate();
		}
	}

	private long count(String jpql, UUID id) {
		return em.createQuery(jpql, Long.class).setParameter("id", id).getSingleResult();
	}
}
