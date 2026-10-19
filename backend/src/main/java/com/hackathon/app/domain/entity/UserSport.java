package com.hackathon.app.domain.entity;

import java.util.UUID;

import com.hackathon.app.domain.enums.SportLevel;
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

/** Вид спорта в профиле пользователя. Одна запись на пару, unique в миграции V13. */
@Entity
@Table(name = "user_sports")
@Getter
@Setter
@NoArgsConstructor
public class UserSport extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Пользователь (id). */
	private UUID userId;
	/** Вид спорта (id). */
	private UUID sportId;
	/** Уровень в этом виде; null — не указан. */
	@Enumerated(EnumType.STRING)
	private SportLevel level;
}
