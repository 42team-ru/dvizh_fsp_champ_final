package com.hackathon.app.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Collection;

import com.hackathon.app.domain.entity.OrganizationAward;
import com.hackathon.app.domain.enums.AwardStatus;
import com.hackathon.app.domain.enums.OrganizationAwardKind;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationAwardRepository extends JpaRepository<OrganizationAward, UUID> {

	Optional<OrganizationAward> findByPeriod(LocalDate period);

	boolean existsByOrganizationIdAndKind(UUID organizationId, OrganizationAwardKind kind);

	List<OrganizationAward> findByOrganizationId(UUID organizationId);

	boolean existsByPeriod(LocalDate period);

	/** Последняя подтверждённая награда не раньше периода from: она и показывается в ленте. */
	Optional<OrganizationAward> findFirstByStatusAndPeriodGreaterThanEqualOrderByPeriodDesc(AwardStatus status,
			LocalDate from);

	/** Самая свежая награда в статусе (для выбора месяца в админке). */
	Optional<OrganizationAward> findFirstByStatusOrderByPeriodDesc(AwardStatus status);

	List<OrganizationAward> findByOrganizationIdAndStatusOrderByPeriodDesc(UUID organizationId, AwardStatus status);

    List<OrganizationAward> findByOrganizationIdInAndStatus(Collection<UUID> organizationIds, AwardStatus status);

}
