package com.hackathon.app.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.entity.Sport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SportRepository extends JpaRepository<Sport, UUID> {

	List<Sport> findAllByOrderByNameAsc();

	List<Sport> findByNormalizedNameContainingOrderByNameAsc(String normalizedName);

	Optional<Sport> findByNormalizedName(String normalizedName);
}
