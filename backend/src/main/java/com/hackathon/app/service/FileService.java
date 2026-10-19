package com.hackathon.app.service;

import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.domain.dto.FileDownload;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.entity.StoredFile;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.mapper.FileMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Файлы: проверка формата и размера, запись в хранилище, метаданные в БД, права на скачивание.
 * Кто может прикрепить файл к профилю, организации или мероприятию, решают вызывающие сервисы.
 * Хранилище и БД согласованы через транзакцию: откат удаляет загруженный объект, удаление объекта — после коммита.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileService {

	static final String NOT_FOUND = "Файл не найден";
	private static final long IMAGE_MAX_BYTES = 5L * 1024 * 1024;
	private static final long DOCUMENT_MAX_BYTES = 10L * 1024 * 1024;
	private static final int MAX_NAME_LENGTH = 255;

	private static final String JPEG = "image/jpeg";
	private static final String PNG = "image/png";
	private static final String WEBP = "image/webp";
	private static final String PDF = "application/pdf";
	private static final Set<String> IMAGES = Set.of(JPEG, PNG, WEBP);
	private static final Set<String> DOCUMENTS = Set.of(PDF, JPEG, PNG);

	private final FileStorage storage;
	private final StoredFileRepository files;
	private final OrganizationRepository organizations;
	private final AppUserRepository users;
	private final FileMapper mapper;

	/** Проверяет файл и сохраняет его; при откате транзакции объект из хранилища удаляется. */
	@Transactional
	public StoredFile store(FileKind kind, FileUpload upload, UUID uploadedById, UUID organizationId, UUID eventId,
			Integer position) {
		var contentType = validate(kind, upload);
		var key = kind.name().toLowerCase() + "/" + UUID.randomUUID();
		storage.put(key, upload.content(), contentType);
		deleteObjectOnRollback(key);
		var file = files.saveAndFlush(mapper.toEntity(kind, key, contentType, upload.content().length,
				originalName(upload.originalName(), contentType), uploadedById, organizationId, eventId, position));
		log.info("File stored: fileId={}, kind={}, size={}, uploadedById={}", file.getId(), kind, file.getSizeBytes(),
				uploadedById);
		return file;
	}

	/** Удаляет строку сейчас, объект в хранилище — после коммита. */
	@Transactional
	public void delete(StoredFile file) {
		files.delete(file);
		var key = file.getObjectKey();
		afterCommit(() -> {
			try {
				storage.delete(key);
			}
			catch (RuntimeException e) {
				log.warn("Orphan object left in storage: key={}", key, e);
			}
		});
		log.info("File deleted: fileId={}, kind={}", file.getId(), file.getKind());
	}

	@Transactional
	public void deleteAll(Collection<StoredFile> list) {
		list.forEach(this::delete);
	}

	/**
	 * Скачивание. Аватар, логотип, фото профиля и мероприятия видит любой вошедший. Документы организации — сама
	 * организация, админ и все вошедшие, если организация одобрена. Остальным файла «нет» (404).
	 */
	@Transactional(readOnly = true)
	public FileDownload download(UUID fileId, UUID viewerId) {
		var file = files.findById(fileId).filter(f -> canRead(f, viewerId))
				.orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
		return new FileDownload(file.getOriginalName(), file.getContentType(), file.getSizeBytes(),
				file.getKind() == FileKind.ORG_DOCUMENT, storage.get(file.getObjectKey()));
	}

	@Transactional(readOnly = true)
	public List<FileResponse> eventPhotos(UUID eventId) {
		return mapper.toResponses(files.findByEventIdAndKindOrderByPositionAscCreatedAtAsc(eventId, FileKind.EVENT_PHOTO));
	}

	/** Обложки для списка мероприятий одним запросом: eventId → ссылка на первое фото. */
	@Transactional(readOnly = true)
	public Map<UUID, String> eventCovers(Collection<UUID> eventIds) {
		var covers = new LinkedHashMap<UUID, String>();
		if (eventIds.isEmpty()) {
			return covers;
		}
		files.findByEventIdInAndKindOrderByPositionAscCreatedAtAsc(eventIds, FileKind.EVENT_PHOTO)
				.forEach(f -> covers.putIfAbsent(f.getEventId(), mapper.fileUrl(f.getId())));
		return covers;
	}

	@Transactional(readOnly = true)
	public List<FileResponse> organizationDocuments(UUID organizationId) {
		return mapper.toResponses(
				files.findByOrganizationIdAndKindOrderByCreatedAtAsc(organizationId, FileKind.ORG_DOCUMENT));
	}

	private boolean canRead(StoredFile file, UUID viewerId) {
		if (file.getKind() != FileKind.ORG_DOCUMENT) {
			return true;
		}
		var org = organizations.findById(file.getOrganizationId()).orElse(null);
		if (org == null) {
			return false;
		}
		if (org.getAccountId().equals(viewerId) || org.getStatus() == OrganizationStatus.APPROVED) {
			return true;
		}
		return users.findById(viewerId).map(u -> u.getSystemRole() == SystemRole.ADMIN).orElse(false);
	}

	/** Тип определяем по первым байтам, а не по заголовку браузера: переименованный .exe картинкой не станет. */
	private static String validate(FileKind kind, FileUpload upload) {
		var content = upload.content();
		if (content == null || content.length == 0) {
			throw new BadRequestException("Файл пустой");
		}
		boolean document = kind == FileKind.ORG_DOCUMENT;
		var type = detectType(content);
		if (type == null || !(document ? DOCUMENTS : IMAGES).contains(type)) {
			throw new BadRequestException(document
					? "Документ должен быть в формате PDF, JPG или PNG"
					: "Изображение должно быть в формате JPG, PNG или WebP");
		}
		long max = document ? DOCUMENT_MAX_BYTES : IMAGE_MAX_BYTES;
		if (content.length > max) {
			throw new BadRequestException("Файл слишком большой: максимум " + max / 1024 / 1024 + " МБ");
		}
		return type;
	}

	private static String detectType(byte[] b) {
		if (startsWith(b, 0xFF, 0xD8, 0xFF)) {
			return JPEG;
		}
		if (startsWith(b, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A)) {
			return PNG;
		}
		if (startsWith(b, 'R', 'I', 'F', 'F') && b.length >= 12 && b[8] == 'W' && b[9] == 'E' && b[10] == 'B'
				&& b[11] == 'P') {
			return WEBP;
		}
		if (startsWith(b, '%', 'P', 'D', 'F', '-')) {
			return PDF;
		}
		return null;
	}

	private static boolean startsWith(byte[] content, int... prefix) {
		if (content.length < prefix.length) {
			return false;
		}
		for (int i = 0; i < prefix.length; i++) {
			if ((content[i] & 0xFF) != prefix[i]) {
				return false;
			}
		}
		return true;
	}

	/** Имя без пути и управляющих символов; пустое — «file.<расширение>». */
	private static String originalName(String name, String contentType) {
		var cleaned = name == null ? "" : name.replaceAll(".*[/\\\\]", "").replaceAll("\\p{Cntrl}", "").strip();
		if (cleaned.isEmpty()) {
			cleaned = "file." + Arrays.stream(contentType.split("/")).reduce((a, b) -> b).orElse("bin");
		}
		return cleaned.length() > MAX_NAME_LENGTH ? cleaned.substring(cleaned.length() - MAX_NAME_LENGTH) : cleaned;
	}

	private void deleteObjectOnRollback(String key) {
		if (!TransactionSynchronizationManager.isSynchronizationActive()) {
			return;
		}
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCompletion(int status) {
				if (status == STATUS_ROLLED_BACK) {
					try {
						storage.delete(key);
					}
					catch (RuntimeException e) {
						log.warn("Orphan object left in storage after rollback: key={}", key, e);
					}
				}
			}
		});
	}

	private static void afterCommit(Runnable action) {
		if (!TransactionSynchronizationManager.isSynchronizationActive()) {
			action.run();
			return;
		}
		TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
			@Override
			public void afterCommit() {
				action.run();
			}
		});
	}
}
