package com.hackathon.app.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

	boolean existsByUsernameIgnoreCase(String username);

	boolean existsByEmailIgnoreCase(String email);

	Optional<AppUser> findByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);

	/** Даты регистраций с момента from — для графика «сколько присоединилось по дням» (группировка по дню — в Java, переносимо для H2). */
	@Query("select u.createdAt from AppUser u where u.createdAt >= :from")
	List<Instant> findCreatedAtSince(Instant from);
}
