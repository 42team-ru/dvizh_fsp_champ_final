package com.hackathon.app.repository;

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
