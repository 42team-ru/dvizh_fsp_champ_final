package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.RecommendationDismissal;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecommendationDismissalRepository extends JpaRepository<RecommendationDismissal, UUID> {

	/** Все мои «Не интересно». */
	List<RecommendationDismissal> findByUserId(UUID userId);

	Optional<RecommendationDismissal> findByUserIdAndEventId(UUID userId, UUID eventId);
}
