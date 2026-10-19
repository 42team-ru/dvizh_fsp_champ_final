package com.hackathon.app.domain.entity;

import java.util.UUID;

import com.hackathon.app.domain.enums.DismissReason;
import jakarta.persistence.Column;
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

/** «Не интересно» в подборке: событие больше не рекомендуется. Одна запись на пару (пользователь, событие), unique в V28. */
@Entity
@Table(name = "recommendation_dismissals")
@Getter
@Setter
@NoArgsConstructor
public class RecommendationDismissal extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Кто скрыл (id пользователя). */
	@Column(nullable = false)
	private UUID userId;
	/** Скрытое мероприятие (id). */
	@Column(nullable = false)
	private UUID eventId;
	/** Вид спорта мероприятия на момент скрытия: штраф виду не зависит от последующей правки события. */
	@Column(nullable = false)
	private UUID sportId;
	/** Почему не подошло. */
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private DismissReason reason;
}
