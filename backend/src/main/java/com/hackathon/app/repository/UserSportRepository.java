package com.hackathon.app.repository;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.UserSport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSportRepository extends JpaRepository<UserSport, UUID> {

	List<UserSport> findByUserId(UUID userId);

	void deleteByUserId(UUID userId);
}
