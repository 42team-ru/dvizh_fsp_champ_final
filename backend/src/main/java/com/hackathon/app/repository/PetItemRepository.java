package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.PetItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PetItemRepository extends JpaRepository<PetItem, UUID> {

	List<PetItem> findAllByOrderByPositionAsc();

	Optional<PetItem> findBySlotIdAndCode(UUID slotId, String code);

	boolean existsBySlotIdAndCode(UUID slotId, String code);

	/** Новая вещь встаёт в конец своего слота. */
	@Query("select coalesce(max(i.position), -1) from PetItem i where i.slotId = :slotId")
	int maxPosition(UUID slotId);

}
