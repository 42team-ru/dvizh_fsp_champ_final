package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.hackathon.app.domain.entity.PetSavedLook;
import org.springframework.data.jpa.repository.JpaRepository;

/** Личные образы, всегда с проверкой владельца. */
public interface PetSavedLookRepository extends JpaRepository<PetSavedLook, UUID> {
    List<PetSavedLook> findByUserIdOrderByCreatedAtAsc(UUID userId);
    long countByUserId(UUID userId);
    Optional<PetSavedLook> findByIdAndUserId(UUID id, UUID userId);
}
