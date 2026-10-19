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

/**
 * Фото в альбоме человека, привязанное к мероприятию. Сам файл — в files (kind = ALBUM_PHOTO).
 */
@Entity
@Table(name = "album_photos")
@Getter
@Setter
@NoArgsConstructor
public class AlbumPhoto extends AuditEntity {

	/**
	 * Идентификатор фото.
	 */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/**
	 * Владелец альбома (кто загрузил).
	 */
	private UUID userId;
	/**
	 * Мероприятие, с которого фото.
	 */
	private UUID eventId;
	/**
	 * Файл в хранилище.
	 */
	private UUID fileId;
	/**
	 * Подпись; null — без подписи.
	 */
	@Column(length = 300)
	private String caption;
}
