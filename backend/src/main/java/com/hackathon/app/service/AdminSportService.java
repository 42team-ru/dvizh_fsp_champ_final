package com.hackathon.app.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import javax.imageio.ImageIO;

import com.hackathon.app.domain.dto.AdminSportCountsResponse;
import com.hackathon.app.domain.dto.AdminSportResponse;
import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.FocusPoint;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.SportStatus;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.repository.SportUsageRepository;
import com.hackathon.app.repository.StoredFileRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Справочник видов спорта для админа: добавить вид с PNG, переименовать, заменить картинку, одобрить или отклонить вид,
 * предложенный пользователем, объединить дубли. Роль ADMIN проверяет SecurityConfig (/api/admin/**).
 * Вид, на который уже есть мероприятия, не удаляется: его скрывают или объединяют с другим, чтобы мероприятия не осиротели.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminSportService {

	private static final int MAX_PAGE_SIZE = 100;
	private static final long IMAGE_MAX_BYTES = 2L * 1024 * 1024;
	private static final int IMAGE_MIN_SIDE = 256;
	private static final byte[] PNG_SIGNATURE = { (byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A };

	private final SportRepository sports;
	private final SportUsageRepository usage;
	private final StoredFileRepository files;
	private final AppUserRepository users;
	private final DbTimeRepository dbTime;
	private final SportService sportService;
	private final FileService fileService;
	private final SportMapper mapper;
	private final UserMapper userMapper;

	/**
	 * Виды по алфавиту. statuses — любые из указанных (пусто — все), withoutImage — только без своей картинки,
	 * searchText — по подстроке названия без учёта регистра и ё/е. Справочник небольшой, поэтому страница режется в памяти.
	 */
	@Transactional(readOnly = true)
	public PageResponse<AdminSportResponse> list(Collection<SportStatus> statuses, Boolean withoutImage, String searchText,
			int page, int size) {
		var query = SportService.normalize(searchText);
		var all = sports.findAllByOrderByNameAsc();
		var filtered = all.stream()
				.filter(s -> statuses == null || statuses.isEmpty() || statuses.contains(s.getCatalogStatus()))
				.filter(s -> !Boolean.TRUE.equals(withoutImage) || !mapper.hasImage(s))
				.filter(s -> query == null || s.getNormalizedName().contains(query))
				.sorted(Comparator.comparing(Sport::getNormalizedName))
				.toList();
		var pageSize = Math.clamp(size, 1, MAX_PAGE_SIZE);
		var pageIndex = Math.max(page, 0);
		var slice = filtered.stream().skip((long) pageIndex * pageSize).limit(pageSize).toList();
		var lookups = new Lookups(all, slice);
		return PageResponse.slice(slice.stream().map(lookups::toResponse).toList(), pageIndex, pageSize, filtered.size());
	}

	@Transactional(readOnly = true)
	public AdminSportCountsResponse counts() {
		var all = sports.findAll();
		return new AdminSportCountsResponse(all.size(), count(all, SportStatus.ACTIVE), count(all, SportStatus.PENDING),
				count(all, SportStatus.HIDDEN) + count(all, SportStatus.MERGED),
				all.stream().filter(s -> !mapper.hasImage(s)).count());
	}

	@Transactional(readOnly = true)
	public AdminSportResponse get(UUID id) {
		return respond(find(id));
	}

	/** Новый вид от админа: сразу в справочнике или черновиком (published = false → скрыт). PNG необязателен. */
	@Transactional
	public AdminSportResponse create(UUID adminId, String name, FileUpload image, FocusPoint focus, boolean published) {
		var display = SportService.collapseSpaces(name);
		if (display == null) {
			throw new BadRequestException("Введите название вида спорта");
		}
		if (display.length() > 100) {
			throw new BadRequestException("Название слишком длинное: максимум 100 символов");
		}
		var normalized = SportService.normalize(display);
		sports.findByNormalizedName(normalized).ifPresent(existing -> {
			throw new ConflictException("Вид «" + existing.getName() + "» уже есть в справочнике");
		});
		var sport = sports.save(mapper.toCatalog(display, normalized, sportService.freeSlug(normalized.replace(' ', '-')),
				published ? SportStatus.ACTIVE : SportStatus.HIDDEN, adminId));
		if (image != null) {
			attachImage(sport, adminId, image, focus);
		}
		log.info("Sport created by admin: sportId={}, slug={}, published={}, adminId={}", sport.getId(), sport.getSlug(),
				published, adminId);
		return respond(sport);
	}

	/** Новое название; slug остаётся прежним, чтобы не ломать картинку и ссылки. */
	@Transactional
	public AdminSportResponse rename(UUID id, String name) {
		var sport = find(id);
		var display = SportService.collapseSpaces(name);
		if (display == null) {
			throw new BadRequestException("Введите название вида спорта");
		}
		var normalized = SportService.normalize(display);
		sports.findByNormalizedName(normalized).filter(other -> !other.getId().equals(id)).ifPresent(other -> {
			throw new ConflictException("Вид «" + other.getName() + "» уже есть в справочнике");
		});
		mapper.rename(sport, display, normalized);
		return respond(sports.save(sport));
	}

	/** Загружает PNG вместо прежней картинки; точка фокуса — голова персонажа, null — по умолчанию. */
	@Transactional
	public AdminSportResponse replaceImage(UUID id, UUID adminId, FileUpload image, FocusPoint focus) {
		var sport = find(id);
		attachImage(sport, adminId, image, focus);
		return respond(sport);
	}

	/** Убирает загруженный PNG: вид возвращается к встроенной иллюстрации или заглушке. */
	@Transactional
	public AdminSportResponse removeImage(UUID id) {
		var sport = find(id);
		detachImage(sport);
		return respond(sports.save(sport));
	}

	/** Одобрить свой вид пользователя: он становится обычным видом справочника. */
	@Transactional
	public AdminSportResponse approve(UUID id, UUID adminId) {
		var sport = find(id);
		if (sport.getCatalogStatus() != SportStatus.PENDING) {
			throw new ConflictException("Вид «" + sport.getName() + "» не ждёт проверки");
		}
		return decide(sport, SportStatus.ACTIVE, null, null, adminId);
	}

	/** Отключить или отклонить вид: пропадает из справочника, новые мероприятия с ним не создаются, старые остаются. */
	@Transactional
	public AdminSportResponse hide(UUID id, UUID adminId, String reason) {
		var sport = find(id);
		if (sport.getCatalogStatus() == SportStatus.HIDDEN || sport.getCatalogStatus() == SportStatus.MERGED) {
			throw new ConflictException("Вид «" + sport.getName() + "» уже отключён");
		}
		return decide(sport, SportStatus.HIDDEN, Strings.blankToNull(reason), null, adminId);
	}

	/** Вернуть отключённый вид в справочник. Слитый вид вернуть нельзя: его мероприятия уже в другом виде. */
	@Transactional
	public AdminSportResponse restore(UUID id, UUID adminId) {
		var sport = find(id);
		if (sport.getCatalogStatus() != SportStatus.HIDDEN) {
			throw new ConflictException("Вид «" + sport.getName() + "» не отключён");
		}
		return decide(sport, SportStatus.ACTIVE, null, null, adminId);
	}

	/**
	 * Объединить дубль с другим видом: мероприятия, интересы людей и анкеты организаций переходят в целевой вид,
	 * исходный получает статус MERGED. Целевой вид должен быть в справочнике (ACTIVE или PENDING).
	 */
	@Transactional
	public AdminSportResponse merge(UUID id, UUID targetId, String reason, UUID adminId) {
		var sport = find(id);
		if (id.equals(targetId)) {
			throw new BadRequestException("Нельзя объединить вид с самим собой");
		}
		var target = sports.findById(targetId).orElseThrow(() -> new BadRequestException("Целевой вид не найден"));
		if (sport.getCatalogStatus() == SportStatus.MERGED) {
			throw new ConflictException("Вид «" + sport.getName() + "» уже объединён");
		}
		if (target.getCatalogStatus() != SportStatus.ACTIVE && target.getCatalogStatus() != SportStatus.PENDING) {
			throw new ConflictException("Нельзя объединять с отключённым видом «" + target.getName() + "»");
		}
		usage.reassign(id, targetId);
		var why = Strings.blankToNull(reason);
		return decide(sports.findById(id).orElseThrow(), SportStatus.MERGED,
				why != null ? why : "Дубликат вида «" + target.getName() + "»", targetId, adminId);
	}

	/** Удалить вид, на который никто не ссылается; иначе 409 — его скрывают или объединяют. */
	@Transactional
	public void delete(UUID id) {
		var sport = find(id);
		if (usage.usages(id) > 0) {
			throw new ConflictException("Вид «" + sport.getName() + "» используется: скройте его или объедините с другим");
		}
		detachImage(sport);
		sports.delete(sport);
		log.info("Sport deleted by admin: sportId={}, slug={}", id, sport.getSlug());
	}

	private AdminSportResponse decide(Sport sport, SportStatus status, String reason, UUID mergedIntoId, UUID adminId) {
		mapper.moderate(sport, status, reason, mergedIntoId, dbTime.now(), adminId);
		log.info("Sport moderated: sportId={}, status={}, adminId={}", sport.getId(), status, adminId);
		return respond(sports.save(sport));
	}

	private void attachImage(Sport sport, UUID adminId, FileUpload image, FocusPoint focus) {
		validatePng(image);
		var stored = fileService.store(FileKind.SPORT_IMAGE, image, adminId, null, null, null);
		var previous = sport.getImageFileId();
		mapper.image(sport, stored.getId(), focus);
		sports.save(sport);
		if (previous != null) {
			files.findById(previous).ifPresent(fileService::delete);
		}
	}

	private void detachImage(Sport sport) {
		var previous = sport.getImageFileId();
		mapper.image(sport, null, null);
		sports.save(sport);
		if (previous != null) {
			files.findById(previous).ifPresent(fileService::delete);
		}
	}

	/** PNG по сигнатуре, до 2 МБ, квадрат не меньше 256×256: картинка обрезается в квадрат и 2:1 вокруг точки фокуса. */
	private static void validatePng(FileUpload image) {
		var bytes = image.content();
		if (bytes == null || bytes.length == 0) {
			throw new BadRequestException("Файл пустой");
		}
		if (bytes.length < PNG_SIGNATURE.length || !java.util.Arrays.equals(java.util.Arrays.copyOf(bytes, 8), PNG_SIGNATURE)) {
			throw new BadRequestException("Картинка вида должна быть в формате PNG");
		}
		if (bytes.length > IMAGE_MAX_BYTES) {
			throw new BadRequestException("Файл слишком большой: максимум 2 МБ");
		}
		try {
			var decoded = ImageIO.read(new ByteArrayInputStream(bytes));
			if (decoded == null) {
				throw new BadRequestException("Не удалось прочитать PNG");
			}
			if (decoded.getWidth() != decoded.getHeight() || decoded.getWidth() < IMAGE_MIN_SIDE) {
				throw new BadRequestException("Картинка должна быть квадратной, не меньше 256×256 пикселей");
			}
		}
		catch (IOException e) {
			throw new BadRequestException("Не удалось прочитать PNG");
		}
	}

	private Sport find(UUID id) {
		return sports.findById(id).orElseThrow(() -> new NoSuchElementException("Вид спорта не найден"));
	}

	private AdminSportResponse respond(Sport sport) {
		return new Lookups(sports.findAll(), List.of(sport)).toResponse(sport);
	}

	private static long count(List<Sport> all, SportStatus status) {
		return all.stream().filter(s -> s.getCatalogStatus() == status).count();
	}

	/** Данные для ответов страницы одним набором запросов: счётчики мероприятий, кто предложил, имена целевых видов. */
	private final class Lookups {

		private final Map<UUID, Long> events = usage.eventCounts();
		private final Map<UUID, String> names;
		private final Map<UUID, AppUser> proposers;

		Lookups(List<Sport> all, List<Sport> page) {
			names = all.stream().collect(Collectors.toMap(Sport::getId, Sport::getName));
			proposers = users.findAllById(page.stream().map(Sport::getCreatedById).filter(java.util.Objects::nonNull)
					.distinct().toList()).stream().collect(Collectors.toMap(AppUser::getId, Function.identity()));
		}

		AdminSportResponse toResponse(Sport sport) {
			var proposer = !sport.isCustom() || sport.getCreatedById() == null ? null : proposers.get(sport.getCreatedById());
			return mapper.toAdmin(sport, events.getOrDefault(sport.getId(), 0L),
					proposer == null ? null : userMapper.toShort(proposer),
					sport.getMergedIntoId() == null ? null : names.get(sport.getMergedIntoId()));
		}
	}
}
