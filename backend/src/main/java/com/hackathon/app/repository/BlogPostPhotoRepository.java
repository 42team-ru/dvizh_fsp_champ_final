package com.hackathon.app.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.BlogPostPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogPostPhotoRepository extends JpaRepository<BlogPostPhoto, UUID> {

	List<BlogPostPhoto> findByPostIdOrderByPosition(UUID postId);

	/** Фото страницы постов одним запросом: из них берутся обложки и счётчики. */
	List<BlogPostPhoto> findByPostIdInOrderByPosition(Collection<UUID> postIds);

	boolean existsByFileId(UUID fileId);

	void deleteByPostId(UUID postId);
}
