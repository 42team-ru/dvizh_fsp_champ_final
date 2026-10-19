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

/** Комментарий в обсуждении мероприятия: вопрос участника или ответ организатора. */
@Entity
@Table(name = "comments")
@Getter
@Setter
@NoArgsConstructor
public class Comment extends AuditEntity {

	/** Идентификатор комментария. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Мероприятие (id). */
	private UUID eventId;
	/** Автор (id пользователя). */
	private UUID authorId;
	/** Текст. */
	private String text;
	/** Скрыт модератором (модерация сообщений — доп. фича, пока всегда false). */
	private boolean hidden;
}
