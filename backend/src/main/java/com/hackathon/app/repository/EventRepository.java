package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.entity.Event;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface EventRepository extends JpaRepository<Event, UUID>, JpaSpecificationExecutor<Event> {

	/** Блокирует строку мероприятия до конца транзакции: параллельные записи и одобрения не превысят лимит мест. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select e from Event e where e.id = :id")
	Optional<Event> findByIdForUpdate(UUID id);

	List<Event> findByAuthorIdOrderByStartAtDesc(UUID authorId);
}
