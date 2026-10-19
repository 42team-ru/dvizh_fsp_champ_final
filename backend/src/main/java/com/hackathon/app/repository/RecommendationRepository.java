package com.hackathon.app.repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.RegistrationStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * Чтение сигналов для рекомендаций одним запросом на вид сигнала, а не на каждое мероприятие. Только JPQL —
 * работает и на H2 в тестах. Ключ организатора везде: организация, а у частного лица — автор.
 */
@Repository
@RequiredArgsConstructor
public class RecommendationRepository {

	private final EntityManager em;

	/** Подтверждённая запись кого-то на мероприятие: из них — аудитории организаторов и похожесть видов спорта. */
	public record Participation(UUID userId, UUID eventId, UUID sportId, UUID organizerKey) {
	}

	/** Моя запись на мероприятие (любой статус) с тем, что нужно для профиля. */
	public record MyRegistration(UUID eventId, RegistrationStatus status, Instant createdAt, UUID sportId,
			UUID organizerKey, EventFormat format, Double lat, Double lon) {
	}

	/** Прошедшее занятие, на котором я был: разовое — подтверждённая запись, серия — отметка. */
	public record Attended(UUID occurrenceId, Instant startAt, UUID eventId, UUID sportId, UUID organizerKey,
			EventFormat format, Double lat, Double lon, String timeZone) {
	}

	/** Сигнал «я связан с этим видом спорта» в момент at (проведённое мероприятие, комментарий). */
	public record SportTouch(UUID sportId, Instant at) {
	}

	/** Пара (пользователь, вид спорта) из профилей. */
	public record UserSportPair(UUID userId, UUID sportId) {
	}

	/** Все подтверждённые записи на неудалённые мероприятия. */
	public List<Participation> participations() {
		return em.createQuery("""
				select r.userId, r.eventId, e.sportId, coalesce(e.organizationId, e.authorId)
				from Registration r join Event e on e.id = r.eventId
				where r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED
				  and e.status <> com.hackathon.app.domain.enums.EventStatus.DELETED""", Tuple.class)
				.getResultList().stream()
				.map(row -> new Participation(row.get(0, UUID.class), row.get(1, UUID.class), row.get(2, UUID.class),
						row.get(3, UUID.class)))
				.toList();
	}

	/** Все пары «пользователь — вид спорта» из профилей. */
	public List<UserSportPair> userSportPairs() {
		return em.createQuery("select us.userId, us.sportId from UserSport us", Tuple.class).getResultList().stream()
				.map(row -> new UserSportPair(row.get(0, UUID.class), row.get(1, UUID.class)))
				.toList();
	}

	/** Мои записи на неудалённые мероприятия. */
	public List<MyRegistration> myRegistrations(UUID userId) {
		return em.createQuery("""
				select r.eventId, r.status, r.createdAt, e.sportId, coalesce(e.organizationId, e.authorId),
				       e.format, e.lat, e.lon
				from Registration r join Event e on e.id = r.eventId
				where r.userId = :userId and e.status <> com.hackathon.app.domain.enums.EventStatus.DELETED""", Tuple.class)
				.setParameter("userId", userId)
				.getResultList().stream()
				.map(row -> new MyRegistration(row.get(0, UUID.class), row.get(1, RegistrationStatus.class),
						row.get(2, Instant.class), row.get(3, UUID.class), row.get(4, UUID.class),
						row.get(5, EventFormat.class), row.get(6, Double.class), row.get(7, Double.class)))
				.toList();
	}

	/** Мои посещения в [since, now): разовые и занятия серий, новые первыми. Как в истории посещений. */
	public List<Attended> myAttended(UUID userId, Instant since, Instant now) {
		var singles = em.createQuery("""
				select o.id, o.startAt, e.id, e.sportId, coalesce(e.organizationId, e.authorId), e.format, e.lat, e.lon,
				       e.timeZone
				from EventOccurrence o join Event e on e.id = o.eventId
				where o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
				  and o.startAt >= :since and o.startAt < :now
				  and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED and e.recurring = false
				  and exists (select r.id from Registration r where r.eventId = e.id and r.userId = :userId
				      and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED)""", Tuple.class);
		var series = em.createQuery("""
				select o.id, o.startAt, e.id, e.sportId, coalesce(e.organizationId, e.authorId), e.format, e.lat, e.lon,
				       e.timeZone
				from OccurrenceAttendance a join EventOccurrence o on o.id = a.occurrenceId join Event e on e.id = o.eventId
				where a.userId = :userId and o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
				  and o.startAt >= :since and o.startAt < :now
				  and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED""", Tuple.class);
		var result = new ArrayList<Attended>();
		for (var query : List.of(singles, series)) {
			query.setParameter("userId", userId).setParameter("since", since).setParameter("now", now)
					.getResultList().forEach(row -> result.add(new Attended(row.get(0, UUID.class),
							row.get(1, Instant.class), row.get(2, UUID.class), row.get(3, UUID.class),
							row.get(4, UUID.class), row.get(5, EventFormat.class), row.get(6, Double.class),
							row.get(7, Double.class), row.get(8, String.class))));
		}
		result.sort((a, b) -> b.startAt().compareTo(a.startAt()));
		return result;
	}

	/** Мероприятия, которые я провожу или проводил (автор), — сигнал интереса к их виду спорта. */
	public List<SportTouch> myHosted(UUID userId) {
		return em.createQuery("""
				select e.sportId, e.createdAt from Event e
				where e.authorId = :userId and e.status <> com.hackathon.app.domain.enums.EventStatus.DELETED""", Tuple.class)
				.setParameter("userId", userId)
				.getResultList().stream()
				.map(row -> new SportTouch(row.get(0, UUID.class), row.get(1, Instant.class)))
				.toList();
	}

	/** Обсуждения, в которых я писал: вид спорта мероприятия и время последнего сообщения. */
	public List<SportTouch> myComments(UUID userId) {
		return em.createQuery("""
				select e.sportId, max(c.createdAt) from Comment c join Event e on e.id = c.eventId
				where c.authorId = :userId and c.deletedAt is null
				group by c.eventId, e.sportId""", Tuple.class)
				.setParameter("userId", userId)
				.getResultList().stream()
				.map(row -> new SportTouch(row.get(0, UUID.class), row.get(1, Instant.class)))
				.toList();
	}

	/**
	 * С кем я уже занимался: пользователь → сколько прошедших занятий мы были вместе (разовые — обе записи
	 * подтверждены, серии — обе отметки на занятии).
	 */
	public Map<UUID, Integer> coParticipants(UUID userId, Instant now) {
		var result = new HashMap<UUID, Integer>();
		em.createQuery("""
				select r2.userId, count(distinct e.id)
				from Registration r1 join Registration r2 on r2.eventId = r1.eventId join Event e on e.id = r1.eventId
				where r1.userId = :userId and r2.userId <> :userId
				  and r1.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED
				  and r2.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED
				  and e.recurring = false and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
				  and exists (select o.id from EventOccurrence o where o.eventId = e.id and o.startAt < :now
				      and o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED)
				group by r2.userId""", Tuple.class)
				.setParameter("userId", userId).setParameter("now", now)
				.getResultList().forEach(row -> result.merge(row.get(0, UUID.class), row.get(1, Long.class).intValue(), Integer::sum));
		em.createQuery("""
				select a2.userId, count(a2.id)
				from OccurrenceAttendance a1 join OccurrenceAttendance a2 on a2.occurrenceId = a1.occurrenceId
				  join EventOccurrence o on o.id = a1.occurrenceId
				where a1.userId = :userId and a2.userId <> :userId and o.startAt < :now
				  and o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED
				group by a2.userId""", Tuple.class)
				.setParameter("userId", userId).setParameter("now", now)
				.getResultList().forEach(row -> result.merge(row.get(0, UUID.class), row.get(1, Long.class).intValue(), Integer::sum));
		return result;
	}

	/** Проведённые встречи каждого организатора (как OrganizerTrust, но для всех сразу). */
	public Map<UUID, Long> hostedMeetings(Instant now) {
		var result = new HashMap<UUID, Long>();
		em.createQuery("""
				select coalesce(e.organizationId, e.authorId), count(o)
				from EventOccurrence o join Event e on e.id = o.eventId
				where o.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED and o.startAt < :now
				  and e.status <> com.hackathon.app.domain.enums.EventStatus.DELETED
				group by coalesce(e.organizationId, e.authorId)""", Tuple.class)
				.setParameter("now", now)
				.getResultList().forEach(row -> result.put(row.get(0, UUID.class), row.get(1, Long.class)));
		return result;
	}

	/** Мероприятия, где я соорганизатор (автор проверяется по самому мероприятию). */
	public List<UUID> myCoOrganized(UUID userId) {
		return em.createQuery("select o.eventId from EventOrganizer o where o.userId = :userId", UUID.class)
				.setParameter("userId", userId).getResultList();
	}
}
