package com.hackathon.app.service;

import java.util.NoSuchElementException;
import java.util.UUID;

import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.MeResponse;
import com.hackathon.app.domain.dto.PublicUserResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.mapper.FileMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventFeedRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.EventSpecifications;
import com.hackathon.app.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Профиль пользователя: публичная страница и аватар. Ссылка на аватар хранится в users.avatar_url. */
@Service
@RequiredArgsConstructor
public class UserProfileService {

	private final AppUserRepository users;
	private final StoredFileRepository storedFiles;
	private final FileService files;
	private final FileMapper fileMapper;
	private final PetService pets;
	private final UserMapper userMapper;
	private final EventRepository events;
	private final EventService eventService;
	private final DbTimeRepository dbTime;
	private final EventFeedRepository feed;

	/** Сколько ближайших мероприятий показываем в профиле. */
	private static final int UPCOMING_LIMIT = 50;

	/** Публичный профиль организатора: только активный аккаунт, без email; мероприятия — ближайшие опубликованные (у серии — по ближайшему занятию). */
	@Transactional(readOnly = true)
	public PublicUserResponse getPublic(UUID id, UUID viewerId) {
		var user = users.findById(id).filter(AppUser::isActive)
				.orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		var now = dbTime.now();
		var ids = feed.findIds(EventSpecifications.publishedByAuthor(id), now, null, UPCOMING_LIMIT);
		var upcoming = EventListLookups.sortedLike(events.findAllById(ids), ids);
		return userMapper.toPublic(user, eventService.summaries(upcoming, viewerId));
	}

	/** Новый аватар заменяет прежний: старый файл удаляется. */
	@Transactional
	public MeResponse uploadAvatar(UUID userId, FileUpload upload) {
		var user = find(userId);
		var old = storedFiles.findByUploadedByIdAndKind(userId, FileKind.AVATAR);
		var avatar = files.store(FileKind.AVATAR, upload, userId, null, null, null);
		user.setAvatarUrl(fileMapper.fileUrl(avatar.getId()));
		users.saveAndFlush(user);
		files.deleteAll(old);
		return MeResponse.of(user, pets.get(userId));
	}

	@Transactional
	public MeResponse deleteAvatar(UUID userId) {
		var user = find(userId);
		user.setAvatarUrl(null);
		users.saveAndFlush(user);
		files.deleteAll(storedFiles.findByUploadedByIdAndKind(userId, FileKind.AVATAR));
		return MeResponse.of(user, pets.get(userId));
	}

	private AppUser find(UUID userId) {
		return users.findById(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
	}
}
