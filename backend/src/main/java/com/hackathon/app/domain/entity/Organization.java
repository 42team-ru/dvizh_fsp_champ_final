package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.enums.ContactType;
import com.hackathon.app.domain.enums.OrganizationStatus;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.MapKeyEnumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/**
 * Анкета организации (клуб, кружок, федерация). Одна на аккаунт роли ORG.
 * Публиковать мероприятия от организации можно только при status = APPROVED.
 */
@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
public class Organization extends AuditEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	private UUID accountId;
	private String name;
	private String description;
	private String city;
	@ElementCollection
	@CollectionTable(name = "organization_contacts", joinColumns = @JoinColumn(name = "organization_id"))
	@MapKeyEnumerated(EnumType.STRING)
	@MapKeyColumn(name = "contact_type")
	@Column(name = "contact_value")
	@BatchSize(size = 50)
	private Map<ContactType, String> contacts = new LinkedHashMap<>();
	@Enumerated(EnumType.STRING)
	private OrganizationStatus status;
	private String rejectReason;
	private Instant submittedAt;
	private Instant reviewedAt;
	private UUID reviewedById;
	/** Логотип (файл в S3); null — без логотипа. */
	private UUID logoFileId;
	/** Служебный код особой организации (например, predatory-beavers); null у обычных, через API не задаётся. */
	private String code;
}
