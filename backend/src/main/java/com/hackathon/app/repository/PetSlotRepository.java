package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.PetSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PetSlotRepository extends JpaRepository<PetSlot, UUID> {

	List<PetSlot> findAllByOrderByPositionAsc();

	Optional<PetSlot> findByCode(String code);

	boolean existsByCode(String code);

	/** Новый слот встаёт в конец конструктора. */
	@Query("select coalesce(max(s.position), -1) from PetSlot s")
	int maxPosition();
}
