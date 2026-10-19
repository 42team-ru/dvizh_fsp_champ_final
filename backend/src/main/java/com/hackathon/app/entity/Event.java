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

/** Мероприятие — центр модели: вид спорта, место, время и режим записи — его атрибуты. */
@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
public class Event extends AuditEntity {

	public enum Level { ANY, BEGINNER, AMATEUR, PRO }

	public enum Format { TRAINING, GAME, MEETUP, AMATEUR_TOURNAMENT }

	public enum JoinMode { FREE, REQUEST }

	public enum Status { PUBLISHED, UNPUBLISHED, DELETED }

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	private String title;
	private String description;
	private Long sportId;
	private UUID authorId;
	private UUID organizationId;
	private Instant startAt;
	private Instant endAt;
	private boolean offlineMode;
	private String address;
	private String locationNote;
	private Double latitude;
	private Double longitude;
	@Enumerated(EnumType.STRING)
	private Level level;
	@Enumerated(EnumType.STRING)
	private Format format;
	private String requirements;
	private String equipment;
	private Integer capacity;
	@Enumerated(EnumType.STRING)
	private JoinMode joinMode;
	@Enumerated(EnumType.STRING)
	private Status status;
	private String moderationReason;
	private Instant moderatedAt;
	private UUID moderatedById;
}
