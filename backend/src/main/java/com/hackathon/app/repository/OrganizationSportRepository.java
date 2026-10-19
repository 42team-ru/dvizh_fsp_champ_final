package com.hackathon.app.repository;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.OrganizationSport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationSportRepository extends JpaRepository<OrganizationSport, UUID> {

	List<OrganizationSport> findByOrganizationIdOrderByCreatedAt(UUID organizationId);

	List<OrganizationSport> findByOrganizationIdIn(java.util.Collection<UUID> organizationIds);

	void deleteByOrganizationId(UUID organizationId);
}
