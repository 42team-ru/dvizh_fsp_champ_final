package com.hackathon.app.service;

import java.util.NoSuchElementException;
import java.util.UUID;

import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.MeResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.mapper.FileMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Профиль пользователя: пока только аватар. Ссылка на него хранится в users.avatar_url. */
@Service
@RequiredArgsConstructor
public class UserProfileService {

	private final AppUserRepository users;
	private final StoredFileRepository storedFiles;
	private final FileService files;
	private final FileMapper fileMapper;

	/** Новый аватар заменяет прежний: старый файл удаляется. */
	@Transactional
	public MeResponse uploadAvatar(UUID userId, FileUpload upload) {
		var user = find(userId);
		var old = storedFiles.findByUploadedByIdAndKind(userId, FileKind.AVATAR);
		var avatar = files.store(FileKind.AVATAR, upload, userId, null, null, null);
		user.setAvatarUrl(fileMapper.fileUrl(avatar.getId()));
		users.saveAndFlush(user);
		files.deleteAll(old);
		return MeResponse.of(user);
	}

	@Transactional
	public MeResponse deleteAvatar(UUID userId) {
		var user = find(userId);
		user.setAvatarUrl(null);
		users.saveAndFlush(user);
		files.deleteAll(storedFiles.findByUploadedByIdAndKind(userId, FileKind.AVATAR));
		return MeResponse.of(user);
	}

	private AppUser find(UUID userId) {
		return users.findById(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
	}
}
