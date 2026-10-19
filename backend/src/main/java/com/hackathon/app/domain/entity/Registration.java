package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.RegistrationStatus;
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

/** Запись участника на мероприятие: одна на пару (мероприятие, пользователь), unique в миграции V3. */
@Entity
@Table(name = "registrations")
@Getter
@Setter
@NoArgsConstructor
public class Registration extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Мероприятие (id). */
	private UUID eventId;
	/** Участник (id пользователя). */
	private UUID userId;
	/** Статус записи. */
	@Enumerated(EnumType.STRING)
	private RegistrationStatus status;
	/** Сопроводительное сообщение к заявке. */
	private String message;
	/** Причина решения организатора (обычно отказа). */
	private String decisionReason;
	/** Когда принято решение (подтверждение, отказ или отмена); null — ещё не решено. */
	private Instant decidedAt;
	/** Кто принял решение (id пользователя); null — автоматически при свободной записи. */
	private UUID decidedById;
	/** Когда встал в лист ожидания: порядок очереди; null — не в листе ожидания. */
	private Instant queuedAt;
}
