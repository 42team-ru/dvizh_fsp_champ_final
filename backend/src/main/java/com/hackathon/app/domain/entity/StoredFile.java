package com.hackathon.app.domain.entity;

import java.util.UUID;

import com.hackathon.app.domain.enums.FileKind;
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

/**
 * Файл в S3: здесь только метаданные, байты лежат в бакете под ключом objectKey.
 * Браузер получает файл через GET /api/files/{id}, права проверяет FileService.
 */
@Entity
@Table(name = "files")
@Getter
@Setter
@NoArgsConstructor
public class StoredFile extends AuditEntity {

	/** Идентификатор файла, он же в ссылке /api/files/{id}. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Назначение: аватар, логотип, документ организации, фото мероприятия. */
	@Enumerated(EnumType.STRING)
	private FileKind kind;
	/** Ключ объекта в бакете. */
	private String objectKey;
	/** MIME-тип, определённый по содержимому файла. */
	private String contentType;
	/** Размер в байтах. */
	private long sizeBytes;
	/** Имя файла, как его загрузили. */
	private String originalName;
	/** Кто загрузил. */
	private UUID uploadedById;
	/** Организация — для логотипа и документов. */
	private UUID organizationId;
	/** Мероприятие — для фото. */
	private UUID eventId;
	/** Порядок фото в галерее мероприятия. */
	private Integer position;
	/** Подпись к фото альбома. */
	@Column(length = 300)
	private String caption;
	/** Точка фокуса по горизонтали, % ширины; null — центр. Превью обрезаются вокруг неё. */
	@Column(name = "focus_x")
	private Double focusX;
	/** Точка фокуса по вертикали, % высоты; null — центр. */
	@Column(name = "focus_y")
	private Double focusY;
}
