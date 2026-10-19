package com.hackathon.app.entity;

import java.time.Instant;

import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** Даты создания и изменения: Hibernate ставит их сам при вставке и обновлении. */
@MappedSuperclass
@Getter
@Setter
public abstract class AuditEntity {

	@CreationTimestamp
	private Instant createdAt;

	@UpdateTimestamp
	private Instant updatedAt;
}
