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

/** Вещь в инвентаре пользователя (купленная или выданная). Базовые вещи сюда не пишутся. */
@Entity
@Table(name = "user_items")
@Getter
@Setter
@NoArgsConstructor
public class UserItem extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Владелец (id пользователя). */
	private UUID userId;
	/** Вещь (id из pet_items). */
	private UUID itemId;
}
