package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.Collection;
import com.hackathon.app.domain.entity.OrganizationSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;

public interface OrganizationSubscriptionRepository extends JpaRepository<OrganizationSubscription, UUID> {
    Optional<OrganizationSubscription> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);
    long countByOrganizationId(UUID organizationId);
    @Query("select s.userId from OrganizationSubscription s where s.organizationId = :organizationId order by s.createdAt, s.id")
    List<UUID> subscriberIds(UUID organizationId, Pageable pageable);
    @Query("select s.userId from OrganizationSubscription s where s.organizationId = :organizationId")
    List<UUID> subscriberIds(UUID organizationId);

    interface OrganizationCount {
        UUID getOrganizationId();
        long getCount();
    }
    @Query("select s.organizationId as organizationId, count(s) as count from OrganizationSubscription s where s.organizationId in :ids group by s.organizationId")
    List<OrganizationCount> counts(Collection<UUID> ids);
    List<OrganizationSubscription> findByUserIdAndOrganizationIdIn(UUID userId, Collection<UUID> organizationIds);

}
