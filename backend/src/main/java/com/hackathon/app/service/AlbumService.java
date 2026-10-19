package com.hackathon.app.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.AlbumEventResponse;
import com.hackathon.app.domain.dto.AlbumPhotoResponse;
import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.entity.AlbumPhoto;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.AlbumSort;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.AlbumMapper;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AlbumPhotoRepository;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.JpaSort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Альбом: фото человека с мероприятий, где он участник (подтверждённая запись) или организатор.
 * Смотреть чужой альбом и фото мероприятия может любой вошедший; добавлять, подписывать и удалять — только владелец.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlbumService {

	/** Сколько фото может быть в одном альбоме. */
	static final int MAX_PHOTOS = 300;
	private static final int MAX_PAGE = 100;
	/** Сколько мероприятий предлагать в форме загрузки. */
	private static final int ELIGIBLE_LIMIT = 100;

	private final AlbumPhotoRepository photos;
	private final AppUserRepository users;
	private final EventRepository events;
	private final SportRepository sports;
	private final RegistrationRepository registrations;
	private final StoredFileRepository storedFiles;
	private final EventAccessPolicy policy;
	private final FileService files;
	private final AlbumMapper mapper;
	private final UserMapper userMapper;
	private final SportMapper sportMapper;

	/** Альбом человека: фильтр по мероприятию и виду спорта, четыре порядка. Нет человека — 404. */
	@Transactional(readOnly = true)
	public PageResponse<AlbumPhotoResponse> list(UUID ownerId, UUID viewerId, UUID eventId, UUID sportId, AlbumSort sort,
			int page, int size) {
		var owner = users.findById(ownerId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		var order = switch (sort == null ? AlbumSort.NEWEST : sort) {
			case NEWEST -> JpaSort.unsafe(Sort.Direction.DESC, "p.createdAt");
			case OLDEST -> JpaSort.unsafe(Sort.Direction.ASC, "p.createdAt");
			case EVENT_NEWEST -> JpaSort.unsafe(Sort.Direction.DESC, "e.startAt").andUnsafe(Sort.Direction.DESC, "p.createdAt");
			case EVENT_OLDEST -> JpaSort.unsafe(Sort.Direction.ASC, "e.startAt").andUnsafe(Sort.Direction.ASC, "p.createdAt");
		};
		var result = photos.findForUser(ownerId, eventId, sportId,
				PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE), order));
		var eventsById = eventResponses(result.getContent().stream().map(AlbumPhoto::getEventId).toList(), Map.of());
		var author = userMapper.toShort(owner);
		return PageResponse.of(result, p -> mapper.toResponse(p, author, eventsById.get(p.getEventId()),
				ownerId.equals(viewerId)));
	}

	/** Мероприятия в альбоме человека с числом фото: для фильтра и группировки. Последние встречи первыми. */
	@Transactional(readOnly = true)
	public List<AlbumEventResponse> events(UUID ownerId) {
		users.findById(ownerId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		var counts = photos.countByEvent(ownerId).stream()
				.collect(Collectors.toMap(AlbumPhotoRepository.EventCount::getEventId, AlbumPhotoRepository.EventCount::getCount));
		return eventResponses(counts.keySet(), counts).values().stream()
				.sorted((a, b) -> b.startAt().compareTo(a.startAt()))
				.toList();
	}

	/** Куда я могу добавить фото: мои встречи как участника или организатора. */
	@Transactional(readOnly = true)
	public List<AlbumEventResponse> eligibleEvents(UUID userId) {
		var list = photos.findEligibleEvents(userId, PageRequest.of(0, ELIGIBLE_LIMIT));
		var sportsById = sportsById(list.stream().map(Event::getSportId).toList());
		return list.stream().map(e -> mapper.toEvent(e, sportMapper.toResponse(sportsById.get(e.getSportId())), 0)).toList();
	}

	/** Фото всех участников с одного мероприятия, по порядку добавления. Нет мероприятия — 404. */
	@Transactional(readOnly = true)
	public List<AlbumPhotoResponse> forEvent(UUID eventId, UUID viewerId) {
		var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException("Мероприятие не найдено"));
		var list = photos.findByEventIdOrderByCreatedAtAscIdAsc(eventId);
		var authors = users.findAllById(list.stream().map(AlbumPhoto::getUserId).distinct().toList()).stream()
				.collect(Collectors.toMap(AppUser::getId, userMapper::toShort));
		var eventResponse = mapper.toEvent(event, sportMapper.toResponse(sports.findById(event.getSportId()).orElseThrow()),
				list.size());
		return list.stream()
				.map(p -> mapper.toResponse(p, authors.get(p.getUserId()), eventResponse, p.getUserId().equals(viewerId)))
				.toList();
	}

	/**
	 * Добавить фото к своей встрече. Чужая встреча — 403, удалённая — 409, лимит альбома — 409.
	 * Блокировка владельца защищает лимит при параллельных загрузках.
	 */
	@Transactional
	public AlbumPhotoResponse add(UUID userId, UUID eventId, String caption, FileUpload upload) {
		var owner = users.findByIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		if (eventId == null) {
			throw new BadRequestException("Выберите мероприятие, с которого фото");
		}
		var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException("Мероприятие не найдено"));
		if (event.getStatus() == EventStatus.DELETED) {
			throw new ConflictException("Мероприятие удалено: фото к нему добавить нельзя");
		}
		if (!canAdd(event, userId)) {
			throw new ForbiddenException("Добавлять фото можно только к встречам, где вы участник или организатор");
		}
		if (caption != null && caption.length() > 300) {
			throw new BadRequestException("Подпись — не больше 300 символов");
		}
		if (photos.countByUserId(userId) >= MAX_PHOTOS) {
			throw new ConflictException("В альбоме уже " + MAX_PHOTOS + " фото — удалите лишние");
		}
		var file = files.store(FileKind.ALBUM_PHOTO, upload, userId, null, eventId, null);
		var photo = photos.saveAndFlush(mapper.toEntity(userId, eventId, file.getId(), caption));
		log.info("Album photo added: userId={}, eventId={}, photoId={}", userId, eventId, photo.getId());
		return toResponse(photo, owner, event, true);
	}

	/** Сменить подпись своего фото; чужое — 404. */
	@Transactional
	public AlbumPhotoResponse updateCaption(UUID userId, UUID photoId, String caption) {
		var photo = own(userId, photoId);
		mapper.updateCaption(photo, caption);
		photos.saveAndFlush(photo);
		var owner = users.findById(userId).orElseThrow();
		return toResponse(photo, owner, events.findById(photo.getEventId()).orElseThrow(), true);
	}

	/** Удалить своё фото вместе с файлом; чужое — 404. */
	@Transactional
	public void delete(UUID userId, UUID photoId) {
		var photo = own(userId, photoId);
		photos.delete(photo);
		photos.flush();
		storedFiles.findById(photo.getFileId()).ifPresent(files::delete);
		log.info("Album photo deleted: userId={}, photoId={}", userId, photoId);
	}

	/** Участник с подтверждённой записью или организатор (автор, соорганизатор). Решает сервер, не кнопка. */
	private boolean canAdd(Event event, UUID userId) {
		return policy.isOrganizer(event, userId) || registrations.findByEventIdAndUserId(event.getId(), userId)
				.map(r -> r.getStatus() == RegistrationStatus.CONFIRMED).orElse(false);
	}

	private AlbumPhoto own(UUID userId, UUID photoId) {
		return photos.findByIdAndUserId(photoId, userId).orElseThrow(() -> new NoSuchElementException("Фото не найдено"));
	}

	private AlbumPhotoResponse toResponse(AlbumPhoto photo, AppUser owner, Event event, boolean mine) {
		var sport = sportMapper.toResponse(sports.findById(event.getSportId()).orElseThrow());
		return mapper.toResponse(photo, userMapper.toShort(owner), mapper.toEvent(event, sport, 0), mine);
	}

	/** Мероприятия одним запросом и их виды спорта вторым; counts — число фото (нет в карте — 0). */
	private Map<UUID, AlbumEventResponse> eventResponses(Collection<UUID> eventIds, Map<UUID, Long> counts) {
		var list = events.findAllById(eventIds.stream().distinct().toList());
		var sportsById = sportsById(list.stream().map(Event::getSportId).toList());
		return list.stream().collect(Collectors.toMap(Event::getId,
				e -> mapper.toEvent(e, sportMapper.toResponse(sportsById.get(e.getSportId())), counts.getOrDefault(e.getId(), 0L))));
	}

	private Map<UUID, Sport> sportsById(Collection<UUID> ids) {
		return sports.findAllById(ids.stream().distinct().toList()).stream()
				.collect(Collectors.toMap(Sport::getId, Function.identity()));
	}
}
