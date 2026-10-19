package com.hackathon.app.repository;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.PetItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PetItemRepository extends JpaRepository<PetItem, UUID> {

	List<PetItem> findAllByOrderByPositionAsc();

	boolean existsBySlotIdAndCode(UUID slotId, String code);

}
