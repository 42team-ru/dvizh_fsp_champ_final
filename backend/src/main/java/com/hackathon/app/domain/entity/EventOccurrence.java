package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.OccurrenceSource;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Конкретное занятие мероприятия. У разового мероприятия одно занятие, у серии — по одному на каждую дату расписания.
 * По занятиям работают фильтры ленты и карты по датам, на них участники серии отмечаются (и по ним пойдут уведомления).
 * unique (event_id, original_start_at) — в миграции V11.
 */
@Entity
@Table(name = "event_occurrences")
@Getter
@Setter
@NoArgsConstructor
public class EventOccurrence extends AuditEntity {

	/** Идентификатор занятия. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Мероприятие (id). */
	private UUID eventId;
	/** Начало (после переноса — новое). */
	private Instant startAt;
	/** Окончание; null — не указано (бывает только у разового мероприятия). */
	private Instant endAt;
	/** Начало по правилу до переноса: по нему занятие узнаётся при пересчёте расписания; null — не из правила. */
	private Instant originalStartAt;
	/** Откуда взялось занятие. */
	@Enumerated(EnumType.STRING)
	private OccurrenceSource source;
	/** Статус занятия. */
	@Enumerated(EnumType.STRING)
	private OccurrenceStatus status;
	/** Причина отмены; видят участники. */
	private String cancelReason;
	/** Когда отменено. */
	private Instant cancelledAt;
	/** Кто отменил (id пользователя); null — отменено правкой расписания. */
	private UUID cancelledById;
	/** Когда организатор подтвердил, что занятие состоится (кворум); null — не подтверждал. */
	private Instant confirmedAt;
	/** Кто подтвердил (id пользователя). */
	private UUID confirmedById;
	/** Когда занятие обработано начислением наград; null — ещё нет. */
	private Instant rewardProcessedAt;
}
