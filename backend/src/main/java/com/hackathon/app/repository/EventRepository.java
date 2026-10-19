package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.enums.EventStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {

	/** Блокирует строку мероприятия до конца транзакции: параллельные записи и одобрения не превысят лимит мест. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select e from Event e where e.id = :id")
	Optional<Event> findByIdForUpdate(UUID id);

	/** Для идемпотентного демо-сида: такое мероприятие у автора уже есть. */
	boolean existsByAuthorIdAndTitle(UUID authorId, String title);

	/** События организаций, снятые или удалённые админом в [from, to): штраф «Организации месяца». */
	@Query("""
			select e from Event e
			where e.organizationId is not null and e.moderatedAt >= :from and e.moderatedAt < :to
			  and e.status in (com.hackathon.app.domain.enums.EventStatus.UNPUBLISHED, com.hackathon.app.domain.enums.EventStatus.DELETED)""")
	List<Event> findModeratedOrganizationEvents(java.time.Instant from, java.time.Instant to);

	/** Для дашборда админа. */
	long countByStatus(EventStatus status);

	/** Поиск в админке: status необязателен; q — готовый шаблон в нижнем регистре вида %текст% (без поиска — "%"). */
	@Query("""
			select e from Event e
			where (:status is null or e.status = :status)
			  and lower(e.title) like :q""")
	Page<Event> search(EventStatus status, String q, Pageable pageable);

	@Query("select e.authorId as userId, count(e) as count from Event e where e.authorId in :userIds group by e.authorId")
    List<UserCount> countAuthoredByUsers(java.util.Collection<UUID> userIds);

    /** Где я автор или соорганизатор. */
	@Query("""
			select e from Event e
			where e.authorId = :userId or e.id in (select o.eventId from EventOrganizer o where o.userId = :userId)
			order by e.startAt desc""")
	List<Event> findOrganizedBy(UUID userId);

	/**
	 * С каких мероприятий можно добавить фото в альбом: уже начались, не удалены, я организатор или подтверждённый
	 * участник. Те же правила проверяет AlbumService при загрузке. Свежие сверху.
	 */
	@Query("""
			select e from Event e
			where e.status <> com.hackathon.app.domain.enums.EventStatus.DELETED and e.startAt <= :now
			  and (e.authorId = :userId
			    or e.id in (select o.eventId from EventOrganizer o where o.userId = :userId)
			    or e.id in (select r.eventId from Registration r where r.userId = :userId
			        and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED))
			order by e.startAt desc, e.id""")
	List<Event> findAlbumEligible(UUID userId, java.time.Instant now, Pageable limit);
}
