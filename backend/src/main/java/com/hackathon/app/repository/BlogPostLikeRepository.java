package com.hackathon.app.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.BlogPostLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BlogPostLikeRepository extends JpaRepository<BlogPostLike, UUID> {

	/** Сколько лайков у поста: проекция для группировки одним запросом. */
	interface PostCount {

		UUID getPostId();

		long getCount();
	}

	Optional<BlogPostLike> findByPostIdAndUserId(UUID postId, UUID userId);

	long countByPostId(UUID postId);

	@Query("""
			select l.postId as postId, count(l) as count from BlogPostLike l
			where l.postId in :postIds
			group by l.postId""")
	List<PostCount> countByPostIds(Collection<UUID> postIds);

	/** Какие посты из списка я лайкнул. */
	@Query("select l.postId from BlogPostLike l where l.userId = :userId and l.postId in :postIds")
	List<UUID> findLikedPostIds(UUID userId, Collection<UUID> postIds);

	void deleteByPostId(UUID postId);
}
