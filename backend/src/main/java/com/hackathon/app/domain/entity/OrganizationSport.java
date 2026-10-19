package com.hackathon.app.domain.entity;

import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Вид спорта, которым занимается организация (её спортивные интересы). Одна запись на пару, unique в миграции V24. */
@Entity
@Table(name = "organization_sports")
@Getter
@Setter
@NoArgsConstructor
public class OrganizationSport extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Организация (id). */
	private UUID organizationId;
	/** Вид спорта (id). */
	private UUID sportId;
}
