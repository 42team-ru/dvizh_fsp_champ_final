package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.Sport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SportRepository extends JpaRepository<Sport, UUID> {

	List<Sport> findAllByOrderByNameAsc();

	List<Sport> findByNormalizedNameContainingOrderByNameAsc(String normalizedName);

	Optional<Sport> findByNormalizedName(String normalizedName);

	/** Занят ли slug: «мини-футбол» и «мини футбол» — разные виды, но slug у них один. */
	boolean existsBySlug(String slug);
}
