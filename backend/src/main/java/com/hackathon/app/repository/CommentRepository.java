package com.hackathon.app.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

    /**
     * Сколько ответов у сообщения: проекция для группировки одним запросом.
     */
    interface ReplyCount {

        UUID getParentId();

        long getCount();
    }

    /**
     * Обсуждение мероприятия по порядку, без скрытых.
     */
    List<Comment> findByEventIdAndHiddenFalseOrderByCreatedAt(UUID eventId);

    /**
     * Только новые сообщения — для подгрузки чата без перезагрузки всей ленты.
     */
    List<Comment> findByEventIdAndHiddenFalseAndCreatedAtAfterOrderByCreatedAt(UUID eventId, Instant after);

    /**
     * Ответы на сообщения из списка, по одному запросу на всю страницу.
     */
    @Query("""
            select c.parentId as parentId, count(c) as count from Comment c
            where c.parentId in :parentIds and c.hidden = false
            group by c.parentId""")
    List<ReplyCount> countReplies(Collection<UUID> parentIds);
}
