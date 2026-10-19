package com.hackathon.app.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.PersonalReminder;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

/** Личные напоминания «пора выходить». */
public interface PersonalReminderRepository extends JpaRepository<PersonalReminder, UUID> {

	Optional<PersonalReminder> findByUserIdAndOccurrenceId(UUID userId, UUID occurrenceId);

	/** Пора отправлять: запланированные с наступившим сроком, старые первыми. */
	@Query("select r.id from PersonalReminder r where r.status = com.hackathon.app.domain.enums.PersonalReminderStatus.SCHEDULED "
			+ "and r.dueAt <= :now order by r.dueAt")
	List<UUID> due(Instant now, Pageable pageable);

	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select r from PersonalReminder r where r.id = :id")
	Optional<PersonalReminder> lock(UUID id);
}
