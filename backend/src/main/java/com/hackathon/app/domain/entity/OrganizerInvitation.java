package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.OrganizerInviteStatus;
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
 * Приглашение в соорганизаторы: автор зовёт, человек принимает или отказывается. Одна строка на пару
 * (мероприятие, пользователь), unique в миграции V33; повторное приглашение переиспользует строку.
 */
@Entity
@Table(name = "organizer_invitations")
@Getter
@Setter
@NoArgsConstructor
public class OrganizerInvitation extends AuditEntity {

	/** Идентификатор приглашения. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Мероприятие (id). */
	private UUID eventId;
	/** Приглашённый (id пользователя). */
	private UUID userId;
	/** Кто пригласил (id автора мероприятия). */
	private UUID invitedById;
	/** Статус приглашения. */
	@Enumerated(EnumType.STRING)
	private OrganizerInviteStatus status;
	/** Когда приглашённый ответил или автор отозвал приглашение; null — ждёт ответа. */
	private Instant decidedAt;
}
