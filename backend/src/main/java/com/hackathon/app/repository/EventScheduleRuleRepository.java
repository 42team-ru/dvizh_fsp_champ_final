package com.hackathon.app.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.EventScheduleRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface EventScheduleRuleRepository extends JpaRepository<EventScheduleRule, UUID> {

	List<EventScheduleRule> findByEventIdOrderBySortOrder(UUID eventId);

	/** Правила для списка мероприятий одним запросом (описание расписания в ленте). */
	List<EventScheduleRule> findByEventIdInOrderBySortOrder(Collection<UUID> eventIds);

	/** При правке правила заменяются целиком. */
	@Modifying(flushAutomatically = true, clearAutomatically = false)
	@Query("delete from EventScheduleRule r where r.eventId = :eventId")
	void deleteByEventId(UUID eventId);
}
