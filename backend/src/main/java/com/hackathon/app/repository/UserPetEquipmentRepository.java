package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.UserPetEquipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface UserPetEquipmentRepository extends JpaRepository<UserPetEquipment, UUID> {

	List<UserPetEquipment> findByUserId(UUID userId);

	Optional<UserPetEquipment> findByUserIdAndSlotId(UUID userId, UUID slotId);

	/** Полная замена образа: сначала снять всё. Сразу в БД, чтобы новые строки не упёрлись в unique(user_id, slot_id). */
	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("delete from UserPetEquipment e where e.userId = :userId")
	void deleteByUserId(UUID userId);

	/** Удалённую вещь снять со всех бобров. */
	@Modifying(flushAutomatically = true, clearAutomatically = true)
	@Query("delete from UserPetEquipment e where e.itemId = :itemId")
	void deleteByItemId(UUID itemId);

}
