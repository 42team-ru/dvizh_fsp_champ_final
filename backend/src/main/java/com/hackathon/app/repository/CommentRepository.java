package com.hackathon.app.repository;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, UUID> {

	/** Обсуждение мероприятия по порядку, без скрытых. */
	List<Comment> findByEventIdAndHiddenFalseOrderByCreatedAt(UUID eventId);
}
