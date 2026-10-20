package com.hackathon.app.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.BlogComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BlogCommentRepository extends JpaRepository<BlogComment, UUID> {

	/** Сколько неудалённых комментариев у поста: проекция для группировки одним запросом. */
	interface PostCount {

		UUID getPostId();

		long getCount();
	}

	/** Обсуждение поста по порядку, вместе с удалёнными: их текст прячет сервис. */
	List<BlogComment> findByPostIdOrderByCreatedAt(UUID postId);

	@Query("""
			select c.postId as postId, count(c) as count from BlogComment c
			where c.postId in :postIds and c.deletedAt is null
			group by c.postId""")
	List<PostCount> countByPostIds(Collection<UUID> postIds);

	void deleteByPostId(UUID postId);
}
