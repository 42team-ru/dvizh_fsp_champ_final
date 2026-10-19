package com.hackathon.app.domain.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Правило расписания повторяющегося мероприятия (RRULE из RFC 5545). У серии одно или несколько правил,
 * по ним при сохранении строятся занятия (event_occurrences). При правке мероприятия правила заменяются целиком.
 */
@Entity
@Table(name = "event_schedule_rules")
@Getter
@Setter
@NoArgsConstructor
public class EventScheduleRule extends AuditEntity {

	/** Идентификатор правила. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Мероприятие (id). */
	private UUID eventId;
	/** Порядок правила в форме, с нуля. */
	private int sortOrder;
	/** Первое занятие по правилу (DTSTART): местные дата и время в часовом поясе мероприятия. */
	private LocalDateTime firstStart;
	/** Длительность каждого занятия, минуты. */
	private int durationMinutes;
	/** Правило повторения без префикса «RRULE:», например FREQ=WEEKLY;INTERVAL=2;BYDAY=SU. */
	private String rrule;
}
