package com.hackathon.app.service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.domain.entity.Comment;
import com.hackathon.app.domain.enums.ModerationDecision;
import com.hackathon.app.domain.enums.ModerationTarget;
import com.hackathon.app.domain.mapper.CommentMapper;
import com.hackathon.app.repository.CommentRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Модерация обсуждений: администратор скрывает некорректное сообщение, не трогая мероприятие и остальные сообщения.
 * Роль ADMIN проверяет SecurityConfig (/api/admin/**). Скрытое остаётся в потоке заглушкой, ответы на него сохраняются.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminCommentService {

	private final CommentRepository comments;
	private final EventRepository events;
	private final DbTimeRepository dbTime;
	private final CommentMapper mapper;
	private final CommentService commentService;
	private final NotificationSubjects notificationSubjects;
	private final ContentGuard contentGuard;

	/** Скрыть с причиной; повторное скрытие обновляет причину. Автор получает уведомление. */
	@Transactional
	public CommentResponse hide(UUID commentId, UUID adminId, String reason) {
		var comment = find(commentId);
		var event = events.findById(comment.getEventId()).orElseThrow();
		mapper.moderate(comment, true, dbTime.now(), adminId, reason);
		comments.saveAndFlush(comment);
		notificationSubjects.hidden(event, comment, adminId);
		contentGuard.resolve(ModerationTarget.COMMENT, commentId, ModerationDecision.HIDDEN, adminId);
		log.info("Сообщение скрыто: commentId={}, eventId={}, adminId={}", commentId, event.getId(), adminId);
		return commentService.toResponses(event, List.of(comment), adminId).getFirst();
	}

	/** Вернуть скрытое сообщение; у не скрытого ничего не меняется. */
	@Transactional
	public CommentResponse unhide(UUID commentId, UUID adminId) {
		var comment = find(commentId);
		var event = events.findById(comment.getEventId()).orElseThrow();
		if (comment.isHidden()) {
			mapper.moderate(comment, false, null, null, null);
			comments.saveAndFlush(comment);
			contentGuard.resolve(ModerationTarget.COMMENT, commentId, ModerationDecision.APPROVED, adminId);
			log.info("Сообщение возвращено: commentId={}, eventId={}, adminId={}", commentId, event.getId(), adminId);
		}
		return commentService.toResponses(event, List.of(comment), adminId).getFirst();
	}

	private Comment find(UUID commentId) {
		return comments.findById(commentId).orElseThrow(() -> new NoSuchElementException(CommentService.NOT_FOUND));
	}
}
