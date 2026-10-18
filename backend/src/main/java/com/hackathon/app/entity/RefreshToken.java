package com.hackathon.app.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** В базе хранится только SHA-256 от токена: утечка БД не даёт рабочих сессий. */
@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
@NoArgsConstructor
public class RefreshToken {

	@Id
	private UUID id;
	private UUID userId;
	private String tokenHash;
	private Instant expiresAt;
	private Instant revokedAt;
	private Instant createdAt;
}
