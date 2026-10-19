package com.hackathon.app.entity;

import java.time.Instant;
import java.util.UUID;

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

	/** Статус записи. */
	public enum Status {
		/** Подтверждена: участник занимает место. */
		CONFIRMED,
		/** Заявка ждёт решения организатора. */
		PENDING,
		/** Отклонена организатором. */
		REJECTED,
		/** Отменена самим участником. */
		CANCELLED
	}

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
	private Status status;
	/** Сопроводительное сообщение к заявке. */
	private String message;
	/** Причина решения организатора (обычно отказа). */
	private String decisionReason;
	/** Когда принято решение (подтверждение, отказ или отмена); null — ещё не решено. */
	private Instant decidedAt;
	/** Кто принял решение (id пользователя); null — автоматически при свободной записи. */
	private UUID decidedById;
}
