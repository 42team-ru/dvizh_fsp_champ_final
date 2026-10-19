package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.hackathon.app.domain.enums.AwardStatus;
import com.hackathon.app.domain.enums.OrganizationAwardKind;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Награда организации: «Организация месяца» (на период одна, unique в миграции V17) или веха (одна на организацию). */
@Entity
@Table(name = "organization_awards")
@Getter
@Setter
@NoArgsConstructor
public class OrganizationAward extends AuditEntity {

	/** Идентификатор награды. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Победившая организация (id). */
	private UUID organizationId;
	/** Вид награды. */
	@Enumerated(EnumType.STRING)
	private OrganizationAwardKind kind;
	/** Первый день месяца, за который награда; у вех null. */
	private LocalDate period;
	/** Счёт организации за период; у вех 0. */
	private int score;
	/** Предложена сервером или подтверждена админом. */
	@Enumerated(EnumType.STRING)
	private AwardStatus status;
	/** Когда подтверждена; null — ещё нет. */
	private Instant confirmedAt;
	/** Кто подтвердил (id админа). */
	private UUID confirmedById;
}
