package com.hackathon.app.service;

import java.util.NoSuchElementException;
import java.util.UUID;

import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.OrganizationResponse;
import com.hackathon.app.domain.dto.PublicOrganizationResponse;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.OrganizationMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Анкета организации глазами её аккаунта и публичная страница.
 * Отдельного шага «отправить» нет: сохранение анкеты и есть заявка на допуск.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizationService {

	static final String NOT_FOUND = "Организация не найдена";
	private static final String NO_PROFILE = "Анкета организации ещё не заполнена";
	private static final int MAX_DOCUMENTS = 10;

	private final OrganizationRepository organizations;
	private final AppUserRepository users;
	private final DbTimeRepository dbTime;
	private final OrganizationMapper mapper;
	private final FileService files;
	private final StoredFileRepository storedFiles;

	@Transactional(readOnly = true)
	public OrganizationResponse mine(UUID userId) {
		requireOrgAccount(userId);
		return toResponse(requireProfile(userId));
	}

	/**
	 * Первая анкета и правка после отказа уходят на проверку (PENDING). Правка анкеты на проверке
	 * или уже одобренной статус не меняет: одобренная организация правит данные без повторной модерации.
	 */
	@Transactional
	public OrganizationResponse saveMine(UUID userId, SaveOrganizationRequest r) {
		requireOrgAccount(userId);
		var contacts = OrganizationContacts.normalize(r.contacts());
		var org = organizations.findByAccountId(userId).orElse(null);
		var now = dbTime.now();
		if (org == null) {
			org = mapper.toEntity(r, userId, OrganizationStatus.PENDING, now);
		}
		else {
			mapper.update(org, r);
			if (org.getStatus() == OrganizationStatus.REJECTED) {
				mapper.resubmit(org, OrganizationStatus.PENDING, now);
			}
		}
		org.getContacts().clear();
		org.getContacts().putAll(contacts);
		try {
			org = organizations.saveAndFlush(org);
		}
		catch (DataIntegrityViolationException _) { // две первые анкеты одновременно: unique(account_id)
			throw new ConflictException("Анкета уже сохраняется, обновите страницу");
		}
		log.info("Анкета организации сохранена: organizationId={}, accountId={}, status={}", org.getId(), userId,
				org.getStatus());
		return toResponse(org);
	}

	/** Логотип: новый заменяет старый. Статус допуска не меняется. */
	@Transactional
	public OrganizationResponse uploadLogo(UUID userId, FileUpload upload) {
		requireOrgAccount(userId);
		var org = requireProfile(userId);
		var old = org.getLogoFileId();
		var logo = files.store(FileKind.ORG_LOGO, upload, userId, org.getId(), null, null);
		org.setLogoFileId(logo.getId());
		organizations.saveAndFlush(org);
		if (old != null) {
			storedFiles.findById(old).ifPresent(files::delete);
		}
		return toResponse(org);
	}

	@Transactional
	public OrganizationResponse deleteLogo(UUID userId) {
		requireOrgAccount(userId);
		var org = requireProfile(userId);
		var old = org.getLogoFileId();
		if (old != null) {
			org.setLogoFileId(null);
			organizations.saveAndFlush(org);
			storedFiles.findById(old).ifPresent(files::delete);
		}
		return toResponse(org);
	}

	/** Документы (устав, свидетельство): видят организация, админ при проверке и все — после одобрения. */
	@Transactional
	public OrganizationResponse addDocument(UUID userId, FileUpload upload) {
		requireOrgAccount(userId);
		var org = organizations.findByAccountIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException(NO_PROFILE));
		if (storedFiles.countByOrganizationIdAndKind(org.getId(), FileKind.ORG_DOCUMENT) >= MAX_DOCUMENTS) {
			throw new ConflictException("Можно загрузить не больше " + MAX_DOCUMENTS + " документов");
		}
		files.store(FileKind.ORG_DOCUMENT, upload, userId, org.getId(), null, null);
		return toResponse(org);
	}

	@Transactional
	public OrganizationResponse removeDocument(UUID userId, UUID fileId) {
		requireOrgAccount(userId);
		var org = requireProfile(userId);
		var file = storedFiles.findById(fileId)
				.filter(f -> f.getKind() == FileKind.ORG_DOCUMENT && org.getId().equals(f.getOrganizationId()))
				.orElseThrow(() -> new NoSuchElementException(FileService.NOT_FOUND));
		files.delete(file);
		return toResponse(org);
	}

	/** Страница доступна только одобренной организации; остальные для посторонних «не существуют». */
	@Transactional(readOnly = true)
	public PublicOrganizationResponse getPublic(UUID id) {
		return organizations.findByIdAndStatus(id, OrganizationStatus.APPROVED)
				.map(org -> mapper.toPublic(org, files.organizationDocuments(org.getId())))
				.orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
	}

	/**
	 * Анкета аккаунта организации или null, если ещё не заполнена. Для EventAccessPolicy:
	 * статус допуска читаем из БД, а не из токена.
	 */
	@Transactional(readOnly = true)
	public Organization forAccount(UUID accountId) {
		return organizations.findByAccountId(accountId).orElse(null);
	}

	/** Организация мероприятия для карточки (в любом статусе) или null. */
	@Transactional(readOnly = true)
	public Organization find(UUID id) {
		return organizations.findById(id).orElse(null);
	}

	private Organization requireProfile(UUID userId) {
		return organizations.findByAccountId(userId).orElseThrow(() -> new NoSuchElementException(NO_PROFILE));
	}

	private OrganizationResponse toResponse(Organization org) {
		return mapper.toResponse(org, files.organizationDocuments(org.getId()));
	}

	private void requireOrgAccount(UUID userId) {
		var user = users.findById(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		if (user.getSystemRole() != SystemRole.ORG) {
			throw new ForbiddenException("Раздел доступен только аккаунту организации");
		}
	}
}
