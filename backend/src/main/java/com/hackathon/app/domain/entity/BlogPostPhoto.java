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

/** Фото в посте по порядку; первое — обложка. Сам файл лежит в files. */
@Entity
@Table(name = "blog_post_photos")
@Getter
@Setter
@NoArgsConstructor
public class BlogPostPhoto extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Пост (id). */
	@Column(nullable = false)
	private UUID postId;
	/** Файл (id): своё фото поста или фото альбома и мероприятия этой встречи. */
	@Column(nullable = false)
	private UUID fileId;
	/** Порядок показа, с нуля. */
	@Column(nullable = false)
	private int position;
	/** Подпись под фото; null — без подписи. */
	@Column(length = 300)
	private String caption;
}
