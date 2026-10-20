package com.hackathon.app.service;

import java.util.NoSuchElementException;
import java.util.List;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.exception.ConflictException;
import java.util.UUID;

import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.MeResponse;
import com.hackathon.app.domain.dto.PublicUserResponse;
import com.hackathon.app.domain.dto.UpdateProfileRequest;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.ModerationTarget;
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

/**
 * Профиль пользователя: публичная страница, правка профиля и аватар. Ссылка на аватар хранится в users.avatar_url.
 */
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
    private final UserSportService userSports;
    private final AttendanceHistoryService history;
    private final OrganizerTrust trust;
    private final ContentGuard contentGuard;

    /**
     * Сколько ближайших мероприятий показываем в профиле.
     */
    private static final int UPCOMING_LIMIT = 50;

    /**
     * Публичный профиль организатора: только активный аккаунт, без email; мероприятия — ближайшие опубликованные (у серии — по ближайшему занятию).
     */
    @Transactional(readOnly = true)
    public PublicUserResponse getPublic(UUID id, UUID viewerId) {
        var user = users.findById(id).filter(AppUser::isActive)
                .orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        var now = dbTime.now();
        var ids = feed.findIds(EventSpecifications.publishedByAuthor(id), now, null, UPCOMING_LIMIT);
        var upcoming = EventListLookups.sortedLike(events.findAllById(ids), ids);
        var stats = trust.ofPerson(id);
        return userMapper.toPublic(user, userSports.of(id), history.total(id), stats.hostedMeetings(),
                stats.participantsTotal(), eventService.summaries(upcoming, viewerId), photos(id));
    }

    /** Правка своего профиля: имя, фамилия, город, о себе. */
    @Transactional
    public MeResponse update(UUID userId, UpdateProfileRequest request) {
        var user = find(userId);
        contentGuard.requireClean(ContentGuard.fields("Имя", request.firstName(), "Фамилия", request.lastName(),
                "Город", request.city(), "О себе", request.bio()));
        userMapper.updateProfile(user, request);
        users.saveAndFlush(user);
        submitForModeration(user);
        return MeResponse.of(user, pets.get(userId));
    }

    /**
     * Новый аватар заменяет прежний: старый файл удаляется.
     */
    @Transactional
    public MeResponse uploadAvatar(UUID userId, FileUpload upload) {
        var user = find(userId);
        var old = storedFiles.findByUploadedByIdAndKind(userId, FileKind.AVATAR);
        var avatar = files.store(FileKind.AVATAR, upload, userId, null, null, null);
        userMapper.avatar(user, fileMapper.fileUrl(avatar.getId()));
        users.saveAndFlush(user);
        files.deleteAll(old);
        return MeResponse.of(user, pets.get(userId));
    }

    @Transactional
    public MeResponse deleteAvatar(UUID userId) {
        var user = find(userId);
        userMapper.avatar(user, null);
        users.saveAndFlush(user);
        files.deleteAll(storedFiles.findByUploadedByIdAndKind(userId, FileKind.AVATAR));
        return MeResponse.of(user, pets.get(userId));
    }

    /** Галерея профиля: аватар в неё не входит. */
    @Transactional(readOnly = true)
    public List<FileResponse> photos(UUID userId) {
        find(userId);
        return fileMapper.toResponses(storedFiles.findByUploadedByIdAndKindOrderByCreatedAtAscIdAsc(userId, FileKind.USER_PHOTO));
    }

    /** Добавить фото; блокировка владельца защищает лимит при параллельных загрузках. */
    @Transactional
    public List<FileResponse> addPhoto(UUID userId, FileUpload upload) {
        users.findByIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        if (storedFiles.countByUploadedByIdAndKind(userId, FileKind.USER_PHOTO) >= 6) {
            throw new ConflictException("Можно загрузить не больше 6 фото");
        }
        files.store(FileKind.USER_PHOTO, upload, userId, null, null, null);
        return photos(userId);
    }

    /** Удалить только собственное фото галереи; чужие файлы и аватары не затрагиваются. */
    @Transactional
    public List<FileResponse> removePhoto(UUID userId, UUID fileId) {
        users.findByIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        var photo = storedFiles.findById(fileId)
                .filter(f -> f.getKind() == FileKind.USER_PHOTO && userId.equals(f.getUploadedById()))
                .orElseThrow(() -> new NoSuchElementException(FileService.NOT_FOUND));
        files.delete(photo);
        storedFiles.flush();
        return photos(userId);
    }

    private AppUser find(UUID userId) {
        return users.findById(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
    }

    /** Публичные тексты профиля — на проверку модерацией. */
    private void submitForModeration(AppUser user) {
        contentGuard.submit(ModerationTarget.USER_PROFILE, user.getId(), null, user.getId(),
                ContentGuard.snapshot(ContentGuard.fields("Имя", user.getFirstName(), "Фамилия", user.getLastName(),
                        "Город", user.getCity(), "О себе", user.getBio())));
    }
}
