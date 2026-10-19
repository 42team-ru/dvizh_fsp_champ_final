package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.AlbumPhoto;
import com.hackathon.app.domain.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AlbumPhotoRepository extends JpaRepository<AlbumPhoto, UUID> {

	/**
	 * Альбом человека с фильтрами; порядок задаёт Pageable (JpaSort по p.createdAt или e.startAt).
	 * Необязательные фильтры через coalesce: так Postgres знает тип параметра, когда он null.
	 */
	@Query(value = """
			select p from AlbumPhoto p join Event e on e.id = p.eventId
			where p.userId = :userId
			  and p.eventId = coalesce(:eventId, p.eventId)
			  and e.sportId = coalesce(:sportId, e.sportId)""",
			countQuery = """
			select count(p) from AlbumPhoto p join Event e on e.id = p.eventId
			where p.userId = :userId
			  and p.eventId = coalesce(:eventId, p.eventId)
			  and e.sportId = coalesce(:sportId, e.sportId)""")
	Page<AlbumPhoto> findForUser(UUID userId, UUID eventId, UUID sportId, Pageable pageable);

	/** Фото всех участников с одного мероприятия, по порядку добавления. */
	List<AlbumPhoto> findByEventIdOrderByCreatedAtAscIdAsc(UUID eventId);

	Optional<AlbumPhoto> findByIdAndUserId(UUID id, UUID userId);

	long countByUserId(UUID userId);

	/** Мероприятие и число фото с него в альбоме человека. */
	interface EventCount {
		UUID getEventId();

		long getCount();
	}

	@Query("select p.eventId as eventId, count(p) as count from AlbumPhoto p where p.userId = :userId group by p.eventId")
	List<EventCount> countByEvent(UUID userId);

	/**
	 * Куда человек может добавить фото: не удалённые мероприятия, где он автор, соорганизатор
	 * или участник с подтверждённой записью. Последние встречи первыми.
	 */
	@Query("""
			select e from Event e
			where e.status <> com.hackathon.app.domain.enums.EventStatus.DELETED
			  and (e.authorId = :userId
			    or exists (select o.id from EventOrganizer o where o.eventId = e.id and o.userId = :userId)
			    or exists (select r.id from Registration r where r.eventId = e.id and r.userId = :userId
			          and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED))
			order by e.startAt desc, e.id""")
	List<Event> findEligibleEvents(UUID userId, Pageable pageable);
}
