package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.PetSlot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PetSlotRepository extends JpaRepository<PetSlot, UUID> {

	List<PetSlot> findAllByOrderByPositionAsc();

	Optional<PetSlot> findByCode(String code);

}
