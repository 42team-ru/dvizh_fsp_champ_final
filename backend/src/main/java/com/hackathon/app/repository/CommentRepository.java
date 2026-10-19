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
     * Обсуждение мероприятия по порядку; скрытые модератором тоже — их текст прячет сервис.
     */
    List<Comment> findByEventIdOrderByCreatedAt(UUID eventId);

    /**
     * Новые и изменённые после момента (правка, удаление, скрытие) — для подгрузки чата без перезагрузки всей ленты.
     */
    @Query("""
            select c from Comment c
            where c.eventId = :eventId and (c.createdAt > :after or c.updatedAt > :after)
            order by c.createdAt""")
    List<Comment> findChangedAfter(UUID eventId, Instant after);

    /**
     * Ответы на сообщения из списка, по одному запросу на всю страницу.
     */
    @Query("""
            select c.parentId as parentId, count(c) as count from Comment c
            where c.parentId in :parentIds
            group by c.parentId""")
    List<ReplyCount> countReplies(Collection<UUID> parentIds);
}
