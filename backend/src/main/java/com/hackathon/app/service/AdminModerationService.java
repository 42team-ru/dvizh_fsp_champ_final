package com.hackathon.app.service;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.ModerationItemResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Comment;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.ModerationCheck;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.enums.ModerationDecision;
import com.hackathon.app.domain.enums.ModerationStatus;
import com.hackathon.app.domain.enums.ModerationTarget;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.CommentMapper;
import com.hackathon.app.domain.mapper.ModerationCheckMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.CommentRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.ModerationCheckRepository;
import com.hackathon.app.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Очередь постмодерации: что словарь и нейросеть сочли сомнительным, и решения администратора.
 * Роль ADMIN проверяет SecurityConfig (/api/admin/**). Мероприятия и анкеты админ правит существующими
 * действиями (снять с публикации, вернуть на доработку) — они сами закрывают проверку.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminModerationService {

	static final String NOT_FOUND = "Проверка не найдена";
	/** По умолчанию — то, что ждёт решения. */
	private static final List<ModerationStatus> QUEUE = List.of(ModerationStatus.FLAGGED, ModerationStatus.AUTO_HIDDEN);

	private final ModerationCheckRepository checks;
	private final ModerationCheckMapper mapper;
	private final ModerationService moderation;
	private final LlmModerationClient llm;
	private final AdminCommentService adminComments;
	private final CommentRepository comments;
	private final CommentMapper commentMapper;
	private final EventRepository events;
	private final OrganizationRepository organizations;
	private final AppUserRepository users;
	private final UserMapper userMapper;
	private final DbTimeRepository dbTime;

	/** status не задан — очередь (сомнительные и автоскрытые); свежие сверху. */
	@Transactional(readOnly = true)
	public PageResponse<ModerationItemResponse> list(ModerationStatus status, ModerationTarget targetType, int page,
			int size) {
		var statuses = status == null ? QUEUE : List.of(status);
		var result = checks.queue(statuses, targetType, PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 100)));
		var items = toItems(result.getContent());
		return new PageResponse<>(items, result.getNumber(), result.getSize(), result.getTotalElements(),
				result.getTotalPages());
	}

	/** «Всё в порядке»: флаг снимается; автоматически скрытое сообщение возвращается в поток. */
	@Transactional
	public ModerationItemResponse approve(UUID id, UUID adminId) {
		var check = findForUpdate(id);
		if (check.getTargetType() == ModerationTarget.COMMENT) {
			comments.findById(check.getTargetId())
					.filter(c -> c.isHidden() && c.getHiddenById() == null) // скрытое админом возвращают на странице обсуждения
					.ifPresent(c -> {
						commentMapper.moderate(c, false, null, null, null);
						comments.saveAndFlush(c);
					});
		}
		mapper.review(check, ModerationDecision.APPROVED, dbTime.now(), adminId);
		checks.saveAndFlush(check);
		log.info("Модерация: одобрено checkId={}, adminId={}", id, adminId);
		return toItems(List.of(check)).getFirst();
	}

	/** Скрыть сообщение с причиной (как на странице обсуждения); у других текстов — 409. */
	@Transactional
	public ModerationItemResponse hide(UUID id, UUID adminId, String reason) {
		var check = findForUpdate(id);
		if (check.getTargetType() != ModerationTarget.COMMENT) {
			throw new ConflictException("Скрыть можно только сообщение. Мероприятие снимите с публикации, анкету верните на доработку");
		}
		adminComments.hide(check.getTargetId(), adminId, reason);
		// скрытие уже автоскрытого сообщения: проверку закрываем явно, resolve её мог не застать в очереди
		if (check.getStatus() != ModerationStatus.RESOLVED) {
			mapper.review(check, ModerationDecision.HIDDEN, dbTime.now(), adminId);
			checks.saveAndFlush(check);
		}
		return toItems(List.of(check)).getFirst();
	}

	/** Стереть «о себе» в профиле с нарушением; у других текстов — 409. */
	@Transactional
	public ModerationItemResponse clearProfile(UUID id, UUID adminId) {
		var check = findForUpdate(id);
		if (check.getTargetType() != ModerationTarget.USER_PROFILE) {
			throw new ConflictException("Очистить можно только текст профиля");
		}
		var user = users.findById(check.getTargetId()).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		userMapper.clearBio(user);
		users.saveAndFlush(user);
		mapper.review(check, ModerationDecision.ACTION_TAKEN, dbTime.now(), adminId);
		checks.saveAndFlush(check);
		log.info("Модерация: очищен профиль userId={}, adminId={}", user.getId(), adminId);
		return toItems(List.of(check)).getFirst();
	}

	/**
	 * Проверить нейросетью ещё раз, синхронно. Нейросеть выключена — 409. Без общей транзакции:
	 * пока модель думает, строка проверки не заблокирована.
	 */
	public ModerationItemResponse recheck(UUID id) {
		if (!llm.enabled()) {
			throw new ConflictException("Нейросеть выключена: включите MODERATION_LLM_ENABLED");
		}
		moderation.recheck(id);
		// категории загружаются сразу (EAGER), остальное — отдельными запросами
		return toItems(List.of(checks.findById(id).orElseThrow(() -> new NoSuchElementException(NOT_FOUND)))).getFirst();
	}

	private ModerationCheck findForUpdate(UUID id) {
		return checks.findByIdForUpdate(id).orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
	}

	/** Авторы, подписи и признак «скрыто» — по одному запросу на всю страницу. */
	private List<ModerationItemResponse> toItems(List<ModerationCheck> page) {
		var authorIds = page.stream().map(ModerationCheck::getAuthorId).filter(Objects::nonNull)
				.collect(Collectors.toSet());
		var profileIds = idsOf(page, ModerationTarget.USER_PROFILE);
		var allUserIds = new HashSet<>(authorIds);
		allUserIds.addAll(profileIds);
		Map<UUID, AppUser> usersById = byId(users.findAllById(allUserIds), AppUser::getId);
		Map<UUID, Event> eventsById = byId(events.findAllById(page.stream().map(ModerationCheck::getEventId)
				.filter(Objects::nonNull).collect(Collectors.toSet())), Event::getId);
		Map<UUID, Organization> orgsById = byId(organizations.findAllById(idsOf(page, ModerationTarget.ORGANIZATION)),
				Organization::getId);
		Map<UUID, Comment> commentsById = byId(comments.findAllById(idsOf(page, ModerationTarget.COMMENT)), Comment::getId);
		return page.stream().map(check -> {
			String title = switch (check.getTargetType()) {
				case COMMENT, EVENT -> titleOf(eventsById.get(check.getEventId()));
				case ORGANIZATION -> orgsById.containsKey(check.getTargetId()) ? orgsById.get(check.getTargetId()).getName() : null;
				case USER_PROFILE -> nameOf(usersById.get(check.getTargetId()));
			};
			var comment = commentsById.get(check.getTargetId());
			boolean hidden = check.getTargetType() == ModerationTarget.COMMENT && comment != null && comment.isHidden();
			return mapper.toItem(check, usersById.get(check.getAuthorId()), title, hidden);
		}).toList();
	}

	private static Set<UUID> idsOf(List<ModerationCheck> page, ModerationTarget type) {
		return page.stream().filter(c -> c.getTargetType() == type).map(ModerationCheck::getTargetId)
				.collect(Collectors.toSet());
	}

	private static <T> Map<UUID, T> byId(Collection<T> rows, Function<T, UUID> id) {
		return rows.stream().collect(Collectors.toMap(id, Function.identity()));
	}

	private static String titleOf(Event event) {
		return event == null ? null : event.getTitle();
	}

	private static String nameOf(AppUser user) {
		return user == null ? null : (user.getFirstName() + " " + user.getLastName()).strip();
	}
}
