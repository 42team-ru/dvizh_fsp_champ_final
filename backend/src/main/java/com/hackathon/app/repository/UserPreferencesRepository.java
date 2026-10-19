package com.hackathon.app.repository;

import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.UserPreferences;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPreferencesRepository extends JpaRepository<UserPreferences, UUID> {
    Optional<UserPreferences> findByUserId(UUID userId);
}
