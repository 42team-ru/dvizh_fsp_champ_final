package com.hackathon.app.domain.entity;

import java.util.UUID;

import com.hackathon.app.domain.enums.AchievementCode;
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

/** Полученное достижение; createdAt — дата получения. Одно достижение на пользователя. */
@Entity
@Table(name = "user_achievements")
@Getter
@Setter
@NoArgsConstructor
public class UserAchievement extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Кто получил (id пользователя). */
	private UUID userId;
	/** Какое достижение. */
	@Enumerated(EnumType.STRING)
	private AchievementCode code;
}
