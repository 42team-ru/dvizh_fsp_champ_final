package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.LedgerKind;
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

/** Строка журнала монет. refKey уникален (миграция V17): одна награда за одно и то же начисляется один раз. */
@Entity
@Table(name = "coin_ledger")
@Getter
@Setter
@NoArgsConstructor
public class CoinLedgerEntry extends AuditEntity {

	/** Идентификатор строки. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Чьи монеты (id пользователя). */
	private UUID userId;
	/** Сколько монет: плюс — начисление, минус — трата. */
	private int amount;
	/** За что. */
	@Enumerated(EnumType.STRING)
	private LedgerKind kind;
	/** Ключ идемпотентности: «вид:занятие:пользователь» и т.п. */
	private String refKey;
	/** Подпись для человека: «Встреча», «Покупка: Кепка». */
	private String note;
	/** Мероприятие, за которое начислено; null — не про встречу. */
	private UUID eventId;
	/** Занятие, за которое начислено; null — не про встречу. */
	private UUID occurrenceId;
	/** Когда произошло: конец встречи или момент операции. */
	private Instant occurredAt;
}
