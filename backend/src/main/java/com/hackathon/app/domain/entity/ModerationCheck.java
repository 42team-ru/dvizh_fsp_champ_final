package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.domain.enums.ModerationCategory;
import com.hackathon.app.domain.enums.ModerationDecision;
import com.hackathon.app.domain.enums.ModerationSource;
import com.hackathon.app.domain.enums.ModerationStatus;
import com.hackathon.app.domain.enums.ModerationTarget;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Проверка пользовательского текста (сообщения, мероприятия, профиля, анкеты): одна строка на объект,
 * правка текста отправляет её на проверку заново. Сомнительное попадает в очередь администратора.
 */
@Entity
@Table(name = "moderation_checks")
@Getter
@Setter
@NoArgsConstructor
public class ModerationCheck extends AuditEntity {

	/** Идентификатор проверки. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Что проверяем. */
	@Enumerated(EnumType.STRING)
	private ModerationTarget targetType;
	/** Id объекта: сообщения, мероприятия, пользователя или организации. */
	private UUID targetId;
	/** Мероприятие, к которому относится текст (у сообщения — его обсуждение); null — профиль или анкета. */
	private UUID eventId;
	/** Автор текста (id пользователя). */
	private UUID authorId;
	/** Проверенный текст: поля склеены с подписями, чтобы админ видел, где проблема. */
	@Column(length = 12000)
	private String textSnapshot;
	/** Состояние проверки. */
	@Enumerated(EnumType.STRING)
	private ModerationStatus status;
	/** Кто поставил последнюю оценку; null — ещё никто. */
	@Enumerated(EnumType.STRING)
	private ModerationSource source;
	/** Найденные виды нарушений. */
	@ElementCollection(fetch = FetchType.EAGER)
	@CollectionTable(name = "moderation_check_categories", joinColumns = @JoinColumn(name = "check_id"))
	@Column(name = "category", nullable = false, length = 20)
	@Enumerated(EnumType.STRING)
	private Set<ModerationCategory> categories = new HashSet<>();
	/** Насколько серьёзно: 0 — нет нарушений, 3 — грубое. */
	private int severity;
	/** Короткое пояснение оценки для администратора; null — нет. */
	@Column(length = 500)
	private String explanation;
	/** Сколько раз пытались спросить нейросеть (сбои и таймауты). */
	private int attempts;
	/** Когда поставлена последняя оценка; null — ещё не проверено. */
	private Instant checkedAt;
	/** Когда администратор принял решение; null — решения нет. */
	private Instant reviewedAt;
	/** Кто принял решение (id администратора); null — решения нет. */
	private UUID reviewedById;
	/** Решение администратора; null — решения нет. */
	@Enumerated(EnumType.STRING)
	private ModerationDecision decision;
}
