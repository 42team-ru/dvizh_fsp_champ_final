package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.BlogPostStatus;
import com.hackathon.app.domain.enums.BlogPostType;
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

/** Пост в блоге: гайд или рассказ с тренировки. Текст — Markdown, фото — в blog_post_photos. */
@Entity
@Table(name = "blog_posts")
@Getter
@Setter
@NoArgsConstructor
public class BlogPost extends AuditEntity {

	/** Идентификатор поста. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Автор (id пользователя или аккаунта организации). */
	@Column(nullable = false)
	private UUID authorId;
	/** Гайд или пост с тренировки. */
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private BlogPostType type;
	/** Черновик или опубликован. */
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private BlogPostStatus status;
	/** Встреча, о которой пост (только у поста с тренировки). */
	private UUID eventId;
	/** Вид спорта: у поста с тренировки — вид встречи, у гайда — выбранный автором; null — без вида. */
	private UUID sportId;
	/** Заголовок. */
	@Column(nullable = false, length = 120)
	private String title;
	/** Текст в Markdown. */
	@Column(nullable = false, length = 20000)
	private String body;
	/** Виджет «Наши тренировки» в конце поста: ближайшие встречи этой организации; null — не её. */
	private UUID widgetOrganizationId;
	/** Виджет в конце поста: ближайшие встречи этого организатора-человека; null — не его. */
	private UUID widgetUserId;
	/** Можно ли комментировать. */
	@Column(nullable = false)
	private boolean commentsEnabled;
	/** Когда впервые опубликован; null — ещё черновик. */
	private Instant publishedAt;
}
