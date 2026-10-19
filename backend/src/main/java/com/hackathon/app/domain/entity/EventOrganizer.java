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

/** Соорганизатор мероприятия: вместе с автором правит событие и решает заявки. Одна запись на пару, unique в миграции V4. */
@Entity
@Table(name = "event_organizers")
@Getter
@Setter
@NoArgsConstructor
public class EventOrganizer extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Мероприятие (id). */
	private UUID eventId;
	/** Соорганизатор (id пользователя). */
	private UUID userId;
	/** Кто добавил (id автора мероприятия). */
	private UUID addedById;
}
