package com.hackathon.app.repository;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.UserAchievement;
import com.hackathon.app.domain.enums.AchievementCode;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAchievementRepository extends JpaRepository<UserAchievement, UUID> {

	List<UserAchievement> findByUserId(UUID userId);

	List<UserAchievement> findByUserIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(UUID userId, java.time.Instant since);

	boolean existsByUserIdAndCode(UUID userId, AchievementCode code);
}
