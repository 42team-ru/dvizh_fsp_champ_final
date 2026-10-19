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

	/** Идентификатор организации. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Аккаунт роли ORG, который ведёт организацию (id пользователя); один аккаунт — одна анкета. */
	private UUID accountId;
	/** Название, например «Шахматный клуб «Ладья»». */
	private String name;
	/** Чем занимается: для участников и для проверки админом. */
	private String description;
	/** Город; null — не указан. */
	private String city;
	/** Контакты по типу (телефон, Telegram, сайт…); формат проверяет OrganizationContacts, хотя бы один. */
	@ElementCollection
	@CollectionTable(name = "organization_contacts", joinColumns = @JoinColumn(name = "organization_id"))
	@MapKeyEnumerated(EnumType.STRING)
	@MapKeyColumn(name = "contact_type")
	@Column(name = "contact_value")
	@BatchSize(size = 50)
	private Map<ContactType, String> contacts = new LinkedHashMap<>();
	/** Статус допуска: публикация и публичная страница — только при APPROVED. */
	@Enumerated(EnumType.STRING)
	private OrganizationStatus status;
	/** Причина отказа или возврата на доработку; организация видит её в кабинете. */
	private String rejectReason;
	/** Когда анкета последний раз ушла на проверку. */
	private Instant submittedAt;
	/** Когда админ принял последнее решение; null — ещё не рассматривали. */
	private Instant reviewedAt;
	/** Кто принял решение (id администратора); null — ещё не рассматривали. */
	private UUID reviewedById;
	/** Логотип (файл в S3); null — без логотипа. */
	private UUID logoFileId;
	/** Служебный код особой организации (например, predatory-beavers); null у обычных, через API не задаётся. */
	private String code;
}
