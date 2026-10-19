package com.hackathon.app.domain.entity;

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
 * Отметка «приду» участника серии на конкретное занятие. Строка есть — придёт; снял отметку — строка удалена.
 * Лимит мест серии считается по отметкам каждого занятия. unique (occurrence_id, user_id) — в миграции V11.
 */
@Entity
@Table(name = "occurrence_attendances")
@Getter
@Setter
@NoArgsConstructor
public class OccurrenceAttendance extends AuditEntity {

	/** Идентификатор отметки. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Занятие (id). */
	private UUID occurrenceId;
	/** Мероприятие (id), чтобы снимать отметки участника серии одним запросом. */
	private UUID eventId;
	/** Участник (id пользователя). */
	private UUID userId;
}
