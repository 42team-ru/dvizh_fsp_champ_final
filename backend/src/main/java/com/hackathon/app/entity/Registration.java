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

	public enum Status { CONFIRMED, PENDING, REJECTED, CANCELLED }

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	private UUID eventId;
	private UUID userId;
	@Enumerated(EnumType.STRING)
	private Status status;
	private String message;
	private Instant decidedAt;
}
