package com.hackathon.app.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {

    /** С блокировкой строки: баланс монет и личные настройки меняются только под ней, иначе параллельные запросы затрут друг друга. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from AppUser u where u.id = :id")
    Optional<AppUser> findByIdForUpdate(UUID id);

	@Query("""
            select u from AppUser u where (:role is null or u.systemRole = :role)
              and (lower(u.username) like :pattern or lower(u.email) like :pattern
                or lower(u.firstName) like :pattern or lower(u.lastName) like :pattern)
            """)
    org.springframework.data.domain.Page<AppUser> search(String pattern,
            com.hackathon.app.domain.enums.SystemRole role, org.springframework.data.domain.Pageable pageable);

    boolean existsByUsernameIgnoreCase(String username);

	boolean existsByEmailIgnoreCase(String email);

	Optional<AppUser> findByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);

	/** Даты регистраций с момента from — для графика «сколько присоединилось по дням» (группировка по дню — в Java, переносимо для H2). */
	@Query("select u.createdAt from AppUser u where u.createdAt >= :from")
	List<Instant> findCreatedAtSince(Instant from);
}
