package com.hackathon.app.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.ModerationCheck;
import com.hackathon.app.domain.enums.ModerationStatus;
import com.hackathon.app.domain.enums.ModerationTarget;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface ModerationCheckRepository extends JpaRepository<ModerationCheck, UUID> {

	/** Под блокировкой: фоновая оценка не разминётся с решением админа и с правкой текста. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select m from ModerationCheck m where m.id = :id")
	Optional<ModerationCheck> findByIdForUpdate(UUID id);

	Optional<ModerationCheck> findByTargetTypeAndTargetId(ModerationTarget targetType, UUID targetId);

	List<ModerationCheck> findByTargetTypeAndTargetIdIn(ModerationTarget targetType, Collection<UUID> targetIds);

	/** Очередь администратора: фильтры необязательны, свежие сверху. */
	@Query("""
			select m from ModerationCheck m
			where m.status in :statuses and (:targetType is null or m.targetType = :targetType)
			order by m.updatedAt desc""")
	Page<ModerationCheck> queue(Collection<ModerationStatus> statuses, ModerationTarget targetType, Pageable pageable);

	/**
	 * Ждут нейросеть дольше before (свежие ещё обрабатываются сразу после коммита) — для подметальщика,
	 * старые первыми. Неудачная попытка обновляет updatedAt, так что повтор идёт не раньше следующего круга.
	 */
	@Query("""
			select m.id from ModerationCheck m
			where m.status = com.hackathon.app.domain.enums.ModerationStatus.PENDING and m.updatedAt < :before
			order by m.updatedAt""")
	List<UUID> pendingIds(Instant before, Pageable pageable);

	long countByStatusIn(Collection<ModerationStatus> statuses);
}
