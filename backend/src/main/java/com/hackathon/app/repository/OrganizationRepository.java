package com.hackathon.app.repository;

import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.entity.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

	Optional<Organization> findByAccountId(UUID accountId);

	Optional<Organization> findByIdAndStatus(UUID id, Organization.Status status);

	/** status необязателен; q — готовый шаблон в нижнем регистре вида %текст% (без поиска — "%"). */
	@Query("""
			select o from Organization o
			where (:status is null or o.status = :status)
			  and lower(o.name) like :q""")
	Page<Organization> search(Organization.Status status, String q, Pageable pageable);
}
