package com.hackathon.app.service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Comment;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.CommentMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.CommentRepository;
import com.hackathon.app.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Обсуждение под мероприятием вместо чатов: участники спрашивают, организатор отвечает с меткой «Организатор».
 * Читать можно в любом статусе мероприятия, писать — пока оно не удалено (EventAccessPolicy).
 */
@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository comments;
    private final EventRepository events;
    private final AppUserRepository users;
    private final EventAccessPolicy policy;
    private final CommentMapper mapper;

    /**
     * Старые сверху, как в переписке.
     */
    @Transactional(readOnly = true)
    public List<CommentResponse> list(UUID eventId) {
        var event = find(eventId);
        return toResponses(event, comments.findByEventIdAndHiddenFalseOrderByCreatedAt(eventId));
    }

    @Transactional
    public CommentResponse create(UUID eventId, UUID userId, String text) {
        var event = find(eventId);
        var blockedReason = policy.commentBlockedReason(event);
        if (blockedReason != null) {
            throw new ConflictException(blockedReason);
        }
        var saved = comments.saveAndFlush(mapper.toEntity(eventId, userId, text));
        return toResponses(event, List.of(saved)).getFirst();
    }

    private Event find(UUID eventId) {
        return events.findById(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
    }

    /** Авторы и организаторы — по одному запросу на весь список. */
    private List<CommentResponse> toResponses(Event event, List<Comment> eventComments) {
        var organizerIds = policy.organizerIds(event);
        var authorsById = users.findAllById(eventComments.stream().map(Comment::getAuthorId).distinct().toList())
                .stream().collect(Collectors.toMap(AppUser::getId, Function.identity()));
        return eventComments.stream()
                .map(comment -> mapper.toResponse(comment, authorsById.get(comment.getAuthorId()),
                        organizerIds.contains(comment.getAuthorId())))
                .toList();
    }
}
