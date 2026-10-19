package com.hackathon.app.service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.AlbumEventResponse;
import com.hackathon.app.domain.dto.AlbumFolderResponse;
import com.hackathon.app.domain.dto.AlbumPhotoResponse;
import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.entity.StoredFile;
import com.hackathon.app.domain.enums.AlbumSort;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.AlbumMapper;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Альбом профиля: фото с занятий, разложенные по папкам (папка = мероприятие). Добавлять можно только с начавшегося
 * и не удалённого мероприятия, где человек организатор или подтверждённый участник. Смотреть чужой альбом может любой
 * вошедший; подпись и удаление — только владельцу фото. Личные 6 фото «Обо мне» живут отдельно (UserProfileService).
 */
@Service
@RequiredArgsConstructor
public class AlbumService {

	static final int MAX_PHOTOS = 200;
	static final int MAX_CAPTION = 300;
	private static final int MAX_PAGE_SIZE = 100;
	private static final int ELIGIBLE_LIMIT = 50;
	private static final String PHOTO_NOT_FOUND = "Фото не найдено в твоём альбоме";

	private final StoredFileRepository files;
	private final FileService fileService;
	private final EventRepository events;
	private final RegistrationRepository registrations;
	private final AppUserRepository users;
	private final SportRepository sports;
	private final SportMapper sportMapper;
	private final AlbumMapper mapper;
	private final EventAccessPolicy policy;
	private final DbTimeRepository dbTime;

	/** Фото альбома страницей; eventId — одна папка, sportId — фильтр «Все фото». */
	@Transactional(readOnly = true)
	public PageResponse<AlbumPhotoResponse> photos(UUID userId, UUID viewerId, UUID eventId, UUID sportId,
			AlbumSort sort, int page, int size) {
		activeUser(userId);
		var direction = sort == AlbumSort.OLDEST ? Sort.Direction.ASC : Sort.Direction.DESC;
		var result = files.findAlbum(userId, eventId, sportId, PageRequest.of(Math.max(page, 0),
				Math.clamp(size, 1, MAX_PAGE_SIZE), Sort.by(direction, "createdAt", "id")));
		var eventById = eventsById(result.getContent().stream().map(StoredFile::getEventId).distinct().toList());
		boolean mine = userId.equals(viewerId);
		return PageResponse.of(result, f -> mapper.toPhoto(f, eventById.get(f.getEventId()), mine));
	}

	/** Папки: по мероприятию на папку, новые занятия сверху; обложка — последнее загруженное фото. */
	@Transactional(readOnly = true)
	public List<AlbumFolderResponse> folders(UUID userId) {
		activeUser(userId);
		var byEvent = files.findByUploadedByIdAndKindOrderByCreatedAtDescIdDesc(userId, FileKind.ALBUM_PHOTO).stream()
				.collect(Collectors.groupingBy(StoredFile::getEventId, LinkedHashMap::new, Collectors.toList()));
		var eventById = eventsById(byEvent.keySet());
		return byEvent.entrySet().stream()
				.filter(e -> eventById.containsKey(e.getKey()))
				.map(e -> mapper.toFolder(eventById.get(e.getKey()), e.getValue().size(), e.getValue().getFirst().getId()))
				.sorted((a, b) -> b.event().startAt().compareTo(a.event().startAt()))
				.toList();
	}

	/** С каких занятий можно добавить фото — для шага «С какого занятия». */
	@Transactional(readOnly = true)
	public List<AlbumEventResponse> eligibleEvents(UUID userId) {
		var list = events.findAlbumEligible(userId, dbTime.now(), PageRequest.of(0, ELIGIBLE_LIMIT));
		return toEvents(list);
	}

	/** Добавить фото с занятия; блокировка владельца защищает лимит альбома при параллельных загрузках. */
	@Transactional
	public AlbumPhotoResponse add(UUID userId, UUID eventId, String caption, FileUpload upload) {
		if (eventId == null) {
			throw new BadRequestException("Выбери занятие — без него фото не добавить");
		}
		checkCaption(caption);
		users.findByIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException("Мероприятие не найдено"));
		if (event.getStatus() == EventStatus.DELETED) {
			throw new ConflictException("Мероприятие удалено — фото к нему не добавить");
		}
		var registration = registrations.findByEventIdAndUserId(eventId, userId).orElse(null);
		boolean participant = registration != null && registration.getStatus() == RegistrationStatus.CONFIRMED;
		if (!participant && !policy.isOrganizer(event, userId)) {
			throw new ForbiddenException("Это занятие не твоё: добавлять фото можно только с тех, где ты был или которые организовал");
		}
		if (event.getStartAt().isAfter(dbTime.now())) {
			throw new ConflictException("Занятие ещё не началось — фото можно добавить после него");
		}
		if (files.countByUploadedByIdAndKind(userId, FileKind.ALBUM_PHOTO) >= MAX_PHOTOS) {
			throw new ConflictException("Альбом заполнен: не больше " + MAX_PHOTOS + " фото. Удали старые, чтобы добавить новые");
		}
		var photo = fileService.store(FileKind.ALBUM_PHOTO, upload, userId, null, eventId, null);
		mapper.caption(photo, caption);
		files.saveAndFlush(photo);
		return mapper.toPhoto(photo, toEvents(List.of(event)).getFirst(), true);
	}

	/** Подпись меняет только владелец фото; пустая подпись стирается. */
	@Transactional
	public AlbumPhotoResponse caption(UUID userId, UUID fileId, String caption) {
		checkCaption(caption);
		var photo = ownPhoto(userId, fileId);
		mapper.caption(photo, caption);
		files.saveAndFlush(photo);
		var event = events.findById(photo.getEventId()).orElseThrow(() -> new NoSuchElementException(PHOTO_NOT_FOUND));
		return mapper.toPhoto(photo, toEvents(List.of(event)).getFirst(), true);
	}

	@Transactional
	public void remove(UUID userId, UUID fileId) {
		fileService.delete(ownPhoto(userId, fileId));
	}

	/** Чужое фото, аватар или фото «Обо мне» — для альбома их «нет» (404). */
	private StoredFile ownPhoto(UUID userId, UUID fileId) {
		return files.findById(fileId)
				.filter(f -> f.getKind() == FileKind.ALBUM_PHOTO && userId.equals(f.getUploadedById()))
				.orElseThrow(() -> new NoSuchElementException(PHOTO_NOT_FOUND));
	}

	private static void checkCaption(String caption) {
		if (caption != null && caption.strip().length() > MAX_CAPTION) {
			throw new BadRequestException("Подпись не длиннее " + MAX_CAPTION + " символов");
		}
	}

	private void activeUser(UUID userId) {
		users.findById(userId).filter(AppUser::isActive)
				.orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
	}

	private Map<UUID, AlbumEventResponse> eventsById(Collection<UUID> ids) {
		return toEvents(events.findAllById(ids)).stream()
				.collect(Collectors.toMap(AlbumEventResponse::id, Function.identity()));
	}

	private List<AlbumEventResponse> toEvents(List<Event> list) {
		var sportById = sports.findAllById(list.stream().map(Event::getSportId).distinct().toList()).stream()
				.collect(Collectors.toMap(Sport::getId, sportMapper::toResponse));
		return list.stream().map(e -> mapper.toEvent(e, sportById.get(e.getSportId()))).toList();
	}
}
