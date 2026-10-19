package com.hackathon.app.service;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Comment;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.CommentMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.CommentRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Обсуждение под мероприятием как чат: сообщения по порядку, ответ на конкретное сообщение (цитата над ответом),
 * правка и удаление своего. Внешних чатов нет — общение здесь. Читать можно в любом статусе мероприятия,
 * писать — пока оно не удалено. Все «можно ли» — в EventAccessPolicy.
 */
@Service
@RequiredArgsConstructor
public class CommentService {

    static final String NOT_FOUND = "Сообщение не найдено";

    private final CommentRepository comments;
    private final EventRepository events;
    private final AppUserRepository users;
    private final DbTimeRepository dbTime;
    private final EventAccessPolicy policy;
    private final CommentMapper mapper;

    /**
     * Старые сверху, как в переписке. after — только сообщения новее этого момента (подгрузка новых без всей ленты).
     */
    @Transactional(readOnly = true)
    public List<CommentResponse> list(UUID eventId, UUID userId, Instant after) {
        var event = find(eventId);
        var eventComments = after == null
                ? comments.findByEventIdAndHiddenFalseOrderByCreatedAt(eventId)
                : comments.findByEventIdAndHiddenFalseAndCreatedAtAfterOrderByCreatedAt(eventId, after);
        return toResponses(event, eventComments, userId);
    }

    /**
     * Новое сообщение; replyToId — ответ на сообщение этого же мероприятия.
     */
    @Transactional
    public CommentResponse create(UUID eventId, UUID userId, String text, UUID replyToId) {
        var event = find(eventId);
        String blockedReason;
        if (replyToId == null) {
            blockedReason = policy.commentBlockedReason(event);
        } else {
            var parent = comments.findById(replyToId).filter(c -> c.getEventId().equals(eventId) && !c.isHidden())
                    .orElseThrow(() -> new BadRequestException("Сообщение, на которое вы отвечаете, не найдено"));
            blockedReason = policy.replyBlockedReason(event, parent);
        }
        if (blockedReason != null) {
            throw new ConflictException(blockedReason);
        }
        var saved = comments.saveAndFlush(mapper.toEntity(eventId, userId, text, replyToId));
        return toResponses(event, List.of(saved), userId).getFirst();
    }

    /**
     * Исправить своё сообщение; в ответе появится editedAt («изменено»).
     */
    @Transactional
    public CommentResponse update(UUID eventId, UUID commentId, UUID userId, String text) {
        var event = find(eventId);
        var comment = editable(event, commentId, userId);
        mapper.edit(comment, text, dbTime.now());
        comments.saveAndFlush(comment);
        return toResponses(event, List.of(comment), userId).getFirst();
    }

    /**
     * Удалить своё сообщение мягко: вместо текста «Сообщение удалено», ответы на него остаются.
     */
    @Transactional
    public void delete(UUID eventId, UUID commentId, UUID userId) {
        var event = find(eventId);
        var comment = editable(event, commentId, userId);
        mapper.delete(comment, dbTime.now());
        comments.saveAndFlush(comment);
    }

    private Event find(UUID eventId) {
        return events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
    }

    /** Чужое — 403, удалённое или закрытое обсуждение — 409. */
    private Comment editable(Event event, UUID commentId, UUID userId) {
        var comment = comments.findById(commentId)
                .filter(c -> c.getEventId().equals(event.getId()) && !c.isHidden())
                .orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
        var blockedReason = policy.commentEditBlockedReason(event, comment, userId);
        if (blockedReason != null) {
            throw comment.getAuthorId().equals(userId)
                    ? new ConflictException(blockedReason)
                    : new ForbiddenException(blockedReason);
        }
        return comment;
    }

    /** Авторы, цитаты, счётчики ответов и организаторы — по одному запросу на весь список. */
    private List<CommentResponse> toResponses(Event event, List<Comment> page, UUID userId) {
        if (page.isEmpty()) {
            return List.of();
        }
        var organizerIds = policy.organizerIds(event);
        var parentIds = page.stream().map(Comment::getParentId).filter(id -> id != null).distinct().toList();
        Map<UUID, Comment> parentsById = comments.findAllById(parentIds).stream()
                .collect(Collectors.toMap(Comment::getId, Function.identity()));
        var authorIds = new HashSet<UUID>();
        page.forEach(c -> authorIds.add(c.getAuthorId()));
        parentsById.values().forEach(c -> authorIds.add(c.getAuthorId()));
        var authorsById = users.findAllById(authorIds).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
        var repliesById = comments.countReplies(page.stream().map(Comment::getId).toList()).stream()
                .collect(Collectors.toMap(CommentRepository.ReplyCount::getParentId, CommentRepository.ReplyCount::getCount));
        return page.stream()
                .map(comment -> {
                    var parent = comment.getParentId() == null ? null : parentsById.get(comment.getParentId());
                    return mapper.toResponse(comment, authorsById.get(comment.getAuthorId()),
                            organizerIds.contains(comment.getAuthorId()),
                            comment.getAuthorId().equals(userId),
                            policy.commentEditBlockedReason(event, comment, userId) == null,
                            parent == null ? null : mapper.toReply(parent, authorsById.get(parent.getAuthorId())),
                            repliesById.getOrDefault(comment.getId(), 0L));
                })
                .toList();
    }
}
