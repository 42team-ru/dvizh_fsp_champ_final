package com.hackathon.app.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.BlogAuthorResponse;
import com.hackathon.app.domain.dto.BlogEventResponse;
import com.hackathon.app.domain.dto.BlogLikeResponse;
import com.hackathon.app.domain.dto.BlogPhotoRequest;
import com.hackathon.app.domain.dto.BlogPhotoResponse;
import com.hackathon.app.domain.dto.BlogPostRequest;
import com.hackathon.app.domain.dto.BlogPostResponse;
import com.hackathon.app.domain.dto.BlogPostSummaryResponse;
import com.hackathon.app.domain.dto.BlogPromptResponse;
import com.hackathon.app.domain.dto.BlogWidgetResponse;
import com.hackathon.app.domain.dto.EventFilter;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.OrganizationShortResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.BlogPost;
import com.hackathon.app.domain.entity.BlogPostPhoto;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.entity.StoredFile;
import com.hackathon.app.domain.enums.BlogPostStatus;
import com.hackathon.app.domain.enums.BlogPostType;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.BlogMapper;
import com.hackathon.app.domain.mapper.FileMapper;
import com.hackathon.app.domain.mapper.OrganizationMapper;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.BlogCommentRepository;
import com.hackathon.app.repository.BlogPostLikeRepository;
import com.hackathon.app.repository.BlogPostPhotoRepository;
import com.hackathon.app.repository.BlogPostRepository;
import com.hackathon.app.repository.BlogSpecifications;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Блог: гайды без даты и посты с тренировки (о прошедшей встрече, пишут её участники и организаторы).
 * Текст — Markdown, фото — свои загруженные или из альбома этой встречи, в конце — виджет «Наши тренировки»
 * с ближайшими встречами клуба или организатора. Лайки — отдельные записи «пост — человек». Правила — в BlogAccessPolicy.
 */
@Service
@RequiredArgsConstructor
public class BlogService {

	static final String NOT_FOUND = "Пост не найден";
	private static final int MAX_PAGE_SIZE = 50;
	private static final int ELIGIBLE_LIMIT = 50;
	private static final int WIDGET_EVENTS = 3;
	private static final int PROMPT_PHOTOS = 9;
	private static final Duration PROMPT_WINDOW = Duration.ofDays(7);
	private static final Duration TOP_AUTHORS_WINDOW = Duration.ofDays(30);
	private static final Set<FileKind> EVENT_PHOTO_KINDS = Set.of(FileKind.ALBUM_PHOTO, FileKind.EVENT_PHOTO);

	private final BlogPostRepository posts;
	private final BlogPostPhotoRepository photos;
	private final BlogPostLikeRepository likes;
	private final BlogCommentRepository comments;
	private final AppUserRepository users;
	private final OrganizationRepository organizations;
	private final EventRepository events;
	private final EventOccurrenceRepository occurrences;
	private final RegistrationRepository registrations;
	private final SportRepository sports;
	private final StoredFileRepository storedFiles;
	private final FileService fileService;
	private final EventService eventService;
	private final EventAccessPolicy eventPolicy;
	private final BlogAccessPolicy policy;
	private final DbTimeRepository dbTime;
	private final BlogMapper mapper;
	private final FileMapper fileMapper;
	private final SportMapper sportMapper;
	private final OrganizationMapper organizationMapper;

	/**
	 * Лента блога: опубликованные, новые сверху. organizationId — «блог клуба»: посты его аккаунта и о его встречах.
	 */
	@Transactional(readOnly = true)
	public PageResponse<BlogPostSummaryResponse> list(BlogPostType type, UUID sportId, UUID authorId, UUID eventId,
			UUID organizationId, String searchText, int page, int size, UUID userId) {
		var organizationAccountId = organizationId == null ? null
				: organizations.findById(organizationId).map(Organization::getAccountId).orElse(null);
		var result = posts.findAll(
				BlogSpecifications.feed(type, sportId, authorId, eventId, organizationId, organizationAccountId, searchText),
				PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE),
						Sort.by(Sort.Direction.DESC, "publishedAt", "id")));
		var byId = byId(summaries(result.getContent(), userId));
		return PageResponse.of(result, post -> byId.get(post.getId()));
	}

	/** Мои посты: черновики и опубликованные, свежие правки сверху. */
	@Transactional(readOnly = true)
	public PageResponse<BlogPostSummaryResponse> mine(UUID userId, BlogPostStatus status, int page, int size) {
		var result = posts.findAll(BlogSpecifications.mine(userId, status),
				PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE),
						Sort.by(Sort.Direction.DESC, "updatedAt", "id")));
		var byId = byId(summaries(result.getContent(), userId));
		return PageResponse.of(result, post -> byId.get(post.getId()));
	}

	/** Пост целиком: черновик открывается только автору, остальным — 404. */
	@Transactional(readOnly = true)
	public BlogPostResponse get(UUID postId, UUID userId) {
		var post = visible(postId, userId);
		var viewer = user(userId);
		var summary = summaries(List.of(post), userId).getFirst();
		var photoList = photos.findByPostIdOrderByPosition(post.getId());
		var filesById = storedFiles.findAllById(photoList.stream().map(BlogPostPhoto::getFileId).toList()).stream()
				.collect(Collectors.toMap(StoredFile::getId, Function.identity()));
		var photoResponses = photoList.stream().filter(p -> filesById.containsKey(p.getFileId()))
				.map(p -> mapper.toPhotoResponse(filesById.get(p.getFileId()), p.getCaption())).toList();
		return mapper.toResponse(summary, post, photoResponses, widget(post, userId),
				mapper.toViewer(policy.canEdit(post, userId), policy.canEdit(post, userId), policy.canDelete(post, viewer),
						policy.likeBlockedReason(post, viewer) == null, policy.commentBlockedReason(post)));
	}

	/** Новый пост: сразу в публикацию или черновиком (publish = false). */
	@Transactional
	public BlogPostResponse create(UUID userId, BlogPostRequest request) {
		checkWriter(user(userId));
		var target = resolve(request, userId, null);
		boolean publish = Boolean.TRUE.equals(request.publish());
		var post = posts.saveAndFlush(mapper.toEntity(userId, request.type(),
				publish ? BlogPostStatus.PUBLISHED : BlogPostStatus.DRAFT, target.eventId(), target.sportId(),
				request.title(), request.body(), request.widgetOrganizationId(), request.widgetUserId(),
				!Boolean.FALSE.equals(request.commentsEnabled()), publish ? dbTime.now() : null));
		savePhotos(post, request.photos(), userId);
		return get(post.getId(), userId);
	}

	/** Правка заменяет пост целиком; publish = false возвращает опубликованный в черновики. */
	@Transactional
	public BlogPostResponse update(UUID postId, UUID userId, BlogPostRequest request) {
		var post = visible(postId, userId);
		if (!policy.canEdit(post, userId)) {
			throw new ForbiddenException("Править можно только свой пост");
		}
		checkWriter(user(userId));
		var target = resolve(request, userId, post.getEventId());
		boolean publish = Boolean.TRUE.equals(request.publish());
		mapper.update(post, request.type(), publish ? BlogPostStatus.PUBLISHED : BlogPostStatus.DRAFT,
				target.eventId(), target.sportId(), request.title(), request.body(), request.widgetOrganizationId(),
				request.widgetUserId(), !Boolean.FALSE.equals(request.commentsEnabled()), publish ? dbTime.now() : null);
		posts.saveAndFlush(post);
		savePhotos(post, request.photos(), userId);
		return get(post.getId(), userId);
	}

	/** Удаляет автор или админ: вместе с фото, лайками и комментариями; свои загруженные фото — из хранилища. */
	@Transactional
	public void delete(UUID postId, UUID userId) {
		var post = visible(postId, userId);
		if (!policy.canDelete(post, user(userId))) {
			throw new ForbiddenException("Удалить можно только свой пост");
		}
		var old = photos.findByPostIdOrderByPosition(post.getId());
		photos.deleteByPostId(post.getId());
		likes.deleteByPostId(post.getId());
		comments.deleteByPostId(post.getId());
		posts.delete(post);
		posts.flush();
		dropUnusedUploads(old, post.getAuthorId(), Set.of());
	}

	/** Лайк: повторный не создаёт дубль. */
	@Transactional
	public BlogLikeResponse like(UUID postId, UUID userId) {
		var post = visible(postId, userId);
		var reason = policy.likeBlockedReason(post, user(userId));
		if (reason != null) {
			throw new ConflictException(reason);
		}
		if (likes.findByPostIdAndUserId(postId, userId).isEmpty()) {
			likes.saveAndFlush(mapper.toLike(postId, userId));
		}
		return mapper.toLikeResponse(likes.countByPostId(postId), true);
	}

	/** Убрать лайк; если его не было — ничего не меняется. */
	@Transactional
	public BlogLikeResponse unlike(UUID postId, UUID userId) {
		visible(postId, userId);
		likes.findByPostIdAndUserId(postId, userId).ifPresent(like -> {
			likes.delete(like);
			likes.flush();
		});
		return mapper.toLikeResponse(likes.countByPostId(postId), false);
	}

	/** Загрузить фото для поста (JPG, PNG, WebP до 5 МБ); в пост оно попадёт при сохранении. */
	@Transactional
	public FileResponse uploadPhoto(UUID userId, FileUpload upload) {
		checkWriter(user(userId));
		return fileMapper.toResponse(fileService.store(FileKind.BLOG_PHOTO, upload, userId, null, null, null));
	}

	/** О каких встречах можно написать: начались, не удалены, я организатор или подтверждённый участник. */
	@Transactional(readOnly = true)
	public List<BlogEventResponse> eligibleEvents(UUID userId) {
		var list = events.findAlbumEligible(userId, dbTime.now(), PageRequest.of(0, ELIGIBLE_LIMIT));
		var byId = blogEvents(list);
		return list.stream().map(e -> byId.get(e.getId())).toList();
	}

	/** Фото встречи (альбомы участников и фото мероприятия) — выбрать в пост. Только тем, кто на ней был. */
	@Transactional(readOnly = true)
	public List<FileResponse> eventPhotos(UUID eventId, UUID userId) {
		var event = events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
		var forbidden = policy.reportForbiddenReason(event, userId,
				registrations.findByEventIdAndUserId(eventId, userId).orElse(null));
		if (forbidden != null) {
			throw new ForbiddenException(forbidden);
		}
		return fileMapper.toResponses(storedFiles.findByEventIdAndKindInOrderByCreatedAtAscIdAsc(eventId, EVENT_PHOTO_KINDS));
	}

	/**
	 * «Как прошла встреча?»: последняя закончившаяся за неделю встреча, где я был и о которой ещё не писал.
	 * null — предлагать нечего (админу — никогда).
	 */
	@Transactional(readOnly = true)
	public BlogPromptResponse prompt(UUID userId) {
		var me = user(userId);
		if (me.getSystemRole() == SystemRole.ADMIN) {
			return null;
		}
		var now = dbTime.now();
		var finished = occurrences.findFinishedFor(userId, now.minus(PROMPT_WINDOW), now, PageRequest.of(0, 20));
		if (finished.isEmpty()) {
			return null;
		}
		var written = new HashSet<>(posts.findWrittenEventIds(userId,
				finished.stream().map(EventOccurrence::getEventId).distinct().toList()));
		var occurrence = finished.stream().filter(o -> !written.contains(o.getEventId())).findFirst().orElse(null);
		if (occurrence == null) {
			return null;
		}
		var event = events.findById(occurrence.getEventId()).orElse(null);
		if (event == null) {
			return null;
		}
		var files = storedFiles.findByEventIdAndKindInOrderByCreatedAtAscIdAsc(event.getId(), EVENT_PHOTO_KINDS);
		return mapper.toPrompt(blogEvents(List.of(event)).get(event.getId()),
				occurrence.getEndAt() != null ? occurrence.getEndAt() : occurrence.getStartAt(),
				fileMapper.toResponses(files.stream().limit(PROMPT_PHOTOS).toList()), files.size());
	}

	/** «Авторы недели»: больше всех публиковали за последний месяц. */
	@Transactional(readOnly = true)
	public List<BlogAuthorResponse> topAuthors(int limit) {
		var top = posts.findTopAuthors(dbTime.now().minus(TOP_AUTHORS_WINDOW), PageRequest.of(0, Math.clamp(limit, 1, 10)));
		var ids = top.stream().map(BlogPostRepository.AuthorCount::getAuthorId).toList();
		var usersById = users.findAllById(ids).stream().collect(Collectors.toMap(AppUser::getId, Function.identity()));
		var totals = posts.countPublished(ids).stream()
				.collect(Collectors.toMap(BlogPostRepository.AuthorCount::getAuthorId, BlogPostRepository.AuthorCount::getCount));
		var orgs = organizationsByAccount(ids);
		return ids.stream().filter(usersById::containsKey)
				.map(id -> mapper.toAuthor(usersById.get(id), orgs.get(id), totals.getOrDefault(id, 0L))).toList();
	}

	/** Пост, который человек вправе видеть; иначе 404 — черновик чужим не показываем даже по ссылке. */
	public BlogPost visible(UUID postId, UUID userId) {
		return posts.findById(postId).filter(p -> policy.canView(p, userId))
				.orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
	}

	private AppUser user(UUID userId) {
		return users.findById(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
	}

	private void checkWriter(AppUser user) {
		var organization = user.getSystemRole() == SystemRole.ORG
				? organizations.findByAccountId(user.getId()).orElse(null) : null;
		var reason = policy.writeBlockedReason(user, organization);
		if (reason != null) {
			throw new ForbiddenException(reason);
		}
	}

	/** Встреча и вид спорта поста. */
	private record Target(UUID eventId, UUID sportId) {
	}

	/**
	 * Пост с тренировки — только о прошедшей встрече, где автор был (если встреча та же, что и раньше, повторно
	 * не проверяем: правка старого поста не ломается). Гайд — без встречи, вид по выбору. Виджет — один из двух.
	 */
	private Target resolve(BlogPostRequest request, UUID userId, UUID previousEventId) {
		Target target;
		if (request.type() == BlogPostType.EVENT_REPORT) {
			if (request.eventId() == null) {
				throw new BadRequestException("Выбери встречу, о которой пост");
			}
			var event = events.findById(request.eventId())
					.orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
			if (!event.getId().equals(previousEventId)) {
				var forbidden = policy.reportForbiddenReason(event, userId,
						registrations.findByEventIdAndUserId(event.getId(), userId).orElse(null));
				if (forbidden != null) {
					throw new ForbiddenException(forbidden);
				}
				var conflict = policy.reportConflictReason(event, dbTime.now());
				if (conflict != null) {
					throw new ConflictException(conflict);
				}
			}
			target = new Target(event.getId(), event.getSportId());
		}
		else {
			if (request.sportId() != null && !sports.existsById(request.sportId())) {
				throw new BadRequestException("Вид спорта не найден");
			}
			target = new Target(null, request.sportId());
		}
		if (request.widgetOrganizationId() != null && request.widgetUserId() != null) {
			throw new BadRequestException("Виджет показывает встречи либо клуба, либо организатора — выбери одно");
		}
		if (request.widgetOrganizationId() != null && organizations.findById(request.widgetOrganizationId())
				.filter(o -> o.getStatus() == OrganizationStatus.APPROVED).isEmpty()) {
			throw new BadRequestException("Клуб для виджета не найден или ещё не допущен");
		}
		if (request.widgetUserId() != null && users.findById(request.widgetUserId()).filter(AppUser::isActive).isEmpty()) {
			throw new BadRequestException("Организатор для виджета не найден");
		}
		return target;
	}

	/**
	 * Фото заменяются целиком: свои загруженные или альбома и мероприятия этой встречи. Убранные свои загрузки,
	 * которых больше нет ни в одном посте, удаляются из хранилища.
	 */
	private void savePhotos(BlogPost post, List<BlogPhotoRequest> requested, UUID userId) {
		var list = requested == null ? List.<BlogPhotoRequest>of() : requested;
		var ids = list.stream().map(BlogPhotoRequest::fileId).toList();
		if (new HashSet<>(ids).size() != ids.size()) {
			throw new BadRequestException("Одно фото добавлено в пост дважды");
		}
		var filesById = storedFiles.findAllById(ids).stream().collect(Collectors.toMap(StoredFile::getId, Function.identity()));
		for (var id : ids) {
			var file = filesById.get(id);
			boolean own = file != null && file.getKind() == FileKind.BLOG_PHOTO && userId.equals(file.getUploadedById());
			boolean fromEvent = file != null && EVENT_PHOTO_KINDS.contains(file.getKind()) && post.getEventId() != null
					&& post.getEventId().equals(file.getEventId());
			if (!own && !fromEvent) {
				throw new BadRequestException("Это фото нельзя добавить: подходят свои загруженные и фото этой встречи");
			}
		}
		var old = photos.findByPostIdOrderByPosition(post.getId());
		photos.deleteAll(old);
		photos.flush();
		for (int i = 0; i < list.size(); i++) {
			photos.save(mapper.toPhoto(post.getId(), list.get(i).fileId(), i, list.get(i).caption()));
		}
		photos.flush();
		dropUnusedUploads(old, userId, new HashSet<>(ids));
	}

	private void dropUnusedUploads(List<BlogPostPhoto> removed, UUID authorId, Set<UUID> kept) {
		var candidates = removed.stream().map(BlogPostPhoto::getFileId).filter(id -> !kept.contains(id)).toList();
		storedFiles.findAllById(candidates).stream()
				.filter(f -> f.getKind() == FileKind.BLOG_PHOTO && authorId.equals(f.getUploadedById()))
				.filter(f -> !photos.existsByFileId(f.getId()))
				.forEach(fileService::delete);
	}

	/**
	 * Виджет в конце поста: до трёх ближайших встреч клуба (как в его ленте) или организатора-человека.
	 * Клуб, который больше не допущен, и неактивный организатор — без виджета.
	 */
	private BlogWidgetResponse widget(BlogPost post, UUID viewerId) {
		if (post.getWidgetOrganizationId() != null) {
			var org = organizations.findById(post.getWidgetOrganizationId())
					.filter(o -> o.getStatus() == OrganizationStatus.APPROVED).orElse(null);
			if (org == null) {
				return null;
			}
			var filter = new EventFilter(null, null, null, null, null, null, null, org.getId(), null, null, null, null,
					0, WIDGET_EVENTS);
			return mapper.toWidget(organizationMapper.toShort(org), null, eventService.list(filter, viewerId).items());
		}
		if (post.getWidgetUserId() != null) {
			var organizer = users.findById(post.getWidgetUserId()).filter(AppUser::isActive).orElse(null);
			if (organizer == null) {
				return null;
			}
			var now = dbTime.now();
			var upcoming = new ArrayList<Map.Entry<Event, Instant>>();
			for (var event : events.findOrganizedBy(organizer.getId())) {
				if (event.getStatus() != EventStatus.PUBLISHED || eventPolicy.isOrganizationSuspended(event)
						|| eventPolicy.isSingleCancelled(event)) {
					continue;
				}
				var start = eventPolicy.upcomingStart(event, now);
				if (start != null && start.isAfter(now)) {
					upcoming.add(Map.entry(event, start));
				}
			}
			var nearest = upcoming.stream().sorted(Map.Entry.comparingByValue()).limit(WIDGET_EVENTS)
					.map(Map.Entry::getKey).toList();
			return mapper.toWidget(null, organizer, eventService.summaries(nearest, viewerId));
		}
		return null;
	}

	/** Карточки постов: авторы, встречи, обложки, лайки и комментарии — по одному запросу на всю страницу. */
	public List<BlogPostSummaryResponse> summaries(List<BlogPost> page, UUID viewerId) {
		if (page.isEmpty()) {
			return List.of();
		}
		var postIds = page.stream().map(BlogPost::getId).toList();
		var photosByPost = photos.findByPostIdInOrderByPosition(postIds).stream()
				.collect(Collectors.groupingBy(BlogPostPhoto::getPostId));
		var coverIds = photosByPost.values().stream().map(l -> l.getFirst().getFileId()).toList();
		var coverFiles = storedFiles.findAllById(coverIds).stream()
				.collect(Collectors.toMap(StoredFile::getId, Function.identity()));
		var likeCounts = likes.countByPostIds(postIds).stream().collect(
				Collectors.toMap(BlogPostLikeRepository.PostCount::getPostId, BlogPostLikeRepository.PostCount::getCount));
		var liked = new HashSet<>(likes.findLikedPostIds(viewerId, postIds));
		var commentCounts = comments.countByPostIds(postIds).stream().collect(
				Collectors.toMap(BlogCommentRepository.PostCount::getPostId, BlogCommentRepository.PostCount::getCount));
		var authorIds = page.stream().map(BlogPost::getAuthorId).collect(Collectors.toSet());
		var authors = users.findAllById(authorIds).stream().collect(Collectors.toMap(AppUser::getId, Function.identity()));
		var orgs = organizationsByAccount(authorIds);
		var eventList = events.findAllById(page.stream().map(BlogPost::getEventId).filter(Objects::nonNull).distinct().toList());
		var eventsById = blogEvents(eventList);
		var sportsById = sportsById(page.stream().map(BlogPost::getSportId).filter(Objects::nonNull).toList());
		return page.stream().map(post -> {
			var postPhotos = photosByPost.getOrDefault(post.getId(), List.of());
			var coverPhoto = postPhotos.isEmpty() ? null : postPhotos.getFirst();
			var coverFile = coverPhoto == null ? null : coverFiles.get(coverPhoto.getFileId());
			var event = post.getEventId() == null ? null : eventsById.get(post.getEventId());
			return mapper.toSummary(post, coverFile == null ? null : mapper.toPhotoResponse(coverFile, coverPhoto.getCaption()),
					postPhotos.size(), post.getSportId() == null ? null : sportsById.get(post.getSportId()), event,
					authors.get(post.getAuthorId()), orgs.get(post.getAuthorId()),
					// о встрече пишет только тот, кто на ней был: это проверено при сохранении
					post.getType() == BlogPostType.EVENT_REPORT && event != null,
					likeCounts.getOrDefault(post.getId(), 0L), liked.contains(post.getId()),
					commentCounts.getOrDefault(post.getId(), 0L));
		}).toList();
	}

	/** Плашки встреч: вид спорта, организатор, клуб и обложка — одним запросом на список. */
	private Map<UUID, BlogEventResponse> blogEvents(List<Event> list) {
		if (list.isEmpty()) {
			return Map.of();
		}
		var sportsById = sportsById(list.stream().map(Event::getSportId).toList());
		var organizers = users.findAllById(list.stream().map(Event::getAuthorId).distinct().toList()).stream()
				.collect(Collectors.toMap(AppUser::getId, Function.identity()));
		var orgs = organizations.findAllById(list.stream().map(Event::getOrganizationId).filter(Objects::nonNull)
				.distinct().toList()).stream()
				.collect(Collectors.toMap(Organization::getId, organizationMapper::toShort));
		var covers = fileService.eventCovers(list.stream().map(Event::getId).toList());
		return list.stream().collect(Collectors.toMap(Event::getId, e -> mapper.toEvent(e, sportsById.get(e.getSportId()),
				organizers.get(e.getAuthorId()), e.getOrganizationId() == null ? null : orgs.get(e.getOrganizationId()),
				covers.containsKey(e.getId()) ? covers.get(e.getId()).url() : null), (a, b) -> a));
	}

	private Map<UUID, SportResponse> sportsById(Collection<UUID> ids) {
		return sports.findAllById(new LinkedHashSet<>(ids)).stream()
				.collect(Collectors.toMap(Sport::getId, sportMapper::toResponse));
	}

	private Map<UUID, OrganizationShortResponse> organizationsByAccount(Collection<UUID> accountIds) {
		return organizations.findByAccountIdIn(accountIds).stream()
				.collect(Collectors.toMap(Organization::getAccountId, organizationMapper::toShort, (a, b) -> a));
	}

	private static Map<UUID, BlogPostSummaryResponse> byId(List<BlogPostSummaryResponse> list) {
		return list.stream().collect(Collectors.toMap(BlogPostSummaryResponse::id, Function.identity()));
	}
}
