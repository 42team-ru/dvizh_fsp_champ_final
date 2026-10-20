package com.hackathon.app.repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.enums.OrganizationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Organization o where o.id = :id")
    Optional<Organization> findByIdForUpdate(UUID id);

    /**
     * Публичный каталог: только одобренные, «мои» — подписки или посещённые занятия.
     * Город приходит в нижнем регистре, без фильтра — пустая строка: null в lower() Postgres типизирует как bytea.
     */
    @Query("""
        select o from Organization o where o.status = com.hackathon.app.domain.enums.OrganizationStatus.APPROVED
        and (lower(o.name) like :q or lower(o.description) like :q)
        and (:city = '' or lower(o.city) = :city)
        and (:sportId is null or exists (select s.id from OrganizationSport s where s.organizationId = o.id and s.sportId = :sportId))
        and (:mine = false or exists (select s.id from OrganizationSubscription s where s.organizationId = o.id and s.userId = :userId)
            or exists (select e.id from Event e join EventOccurrence oc on oc.eventId = e.id
                where e.organizationId = o.id and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
                and oc.status = com.hackathon.app.domain.enums.OccurrenceStatus.SCHEDULED and oc.startAt < :now
                and ((e.recurring = false and exists (select r.id from Registration r where r.eventId = e.id and r.userId = :userId
                    and r.status = com.hackathon.app.domain.enums.RegistrationStatus.CONFIRMED))
                or (e.recurring = true and exists (select a.id from OccurrenceAttendance a where a.occurrenceId = oc.id and a.userId = :userId)))))
        """)
    Page<Organization> catalog(String q, String city, UUID sportId, boolean mine, UUID userId, Instant now, Pageable pageable);

    @Query("select distinct o.city from Organization o where o.status = com.hackathon.app.domain.enums.OrganizationStatus.APPROVED and o.city is not null order by o.city")
    java.util.List<String> publicCities();

    Optional<Organization> findByAccountId(UUID accountId);

	/** Анкеты аккаунтов одним запросом: подписать сообщения и организаторов названием организации. */
	java.util.List<Organization> findByAccountIdIn(java.util.Collection<UUID> accountIds);

	/** С блокировкой строки: параллельные загрузки документов не превысят лимит. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select o from Organization o where o.accountId = :accountId")
	Optional<Organization> findByAccountIdForUpdate(UUID accountId);

	Optional<Organization> findByCode(String code);

	java.util.List<Organization> findByStatus(OrganizationStatus status);

	Optional<Organization> findByIdAndStatus(UUID id, OrganizationStatus status);

	/** Для дашборда админа. */
	long countByStatus(OrganizationStatus status);

	/** status необязателен; q — готовый шаблон в нижнем регистре вида %текст% (без поиска — "%"). */
	@Query("""
			select o from Organization o
			where (:status is null or o.status = :status)
			  and lower(o.name) like :q""")
	Page<Organization> search(OrganizationStatus status, String q, Pageable pageable);
}
