package com.hackathon.app.domain.entity;

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

/** Лайк поста: одна запись на пару (пост, человек), unique в V37. Счётчик не храним. */
@Entity
@Table(name = "blog_post_likes")
@Getter
@Setter
@NoArgsConstructor
public class BlogPostLike extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Пост (id). */
	@Column(nullable = false)
	private UUID postId;
	/** Кто лайкнул (id пользователя). */
	@Column(nullable = false)
	private UUID userId;
}
