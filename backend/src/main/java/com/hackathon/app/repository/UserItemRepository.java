package com.hackathon.app.repository;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.UserItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserItemRepository extends JpaRepository<UserItem, UUID> {

	List<UserItem> findByUserId(UUID userId);

	boolean existsByUserIdAndItemId(UUID userId, UUID itemId);
}
