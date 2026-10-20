package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Комментарий под постом блога; ответ на сообщение — через parentId. */
@Entity
@Table(name = "blog_comments")
@Getter
@Setter
@NoArgsConstructor
public class BlogComment extends AuditEntity {

	/** Идентификатор комментария. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Пост (id). */
	@Column(nullable = false)
	private UUID postId;
	/** Автор (id пользователя). */
	@Column(nullable = false)
	private UUID authorId;
	/** Текст. */
	@Column(nullable = false, length = 2000)
	private String text;
	/** На какое сообщение это ответ (id); null — в общий поток. */
	private UUID parentId;
	/** Когда автор последний раз изменил текст; null — не менялось. */
	private Instant editedAt;
	/** Когда автор удалил сообщение (мягко: ответы на него остаются); null — не удалено. */
	private Instant deletedAt;
}
