package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.PersonalReminderStatus;
import com.hackathon.app.domain.enums.TravelMode;
import jakarta.persistence.Column;
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

/** Личное напоминание «пора выходить» на занятие или отказ от подсказки. Одна запись на пару (пользователь, занятие), unique в V31. */
@Entity
@Table(name = "personal_reminders")
@Getter
@Setter
@NoArgsConstructor
public class PersonalReminder extends AuditEntity {

	/** Идентификатор записи. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Кому напомнить (id пользователя). */
	@Column(nullable = false)
	private UUID userId;
	/** Мероприятие (id). */
	@Column(nullable = false)
	private UUID eventId;
	/** Занятие (id). */
	@Column(nullable = false)
	private UUID occurrenceId;
	/** Начало занятия на момент постановки: перенесли — напоминание отменяется. */
	@Column(nullable = false)
	private Instant expectedStartAt;
	/** Когда напомнить; у отказа от подсказки нет. */
	private Instant dueAt;
	/** Состояние. */
	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private PersonalReminderStatus status;
	/** Сколько минут в пути по выбранному способу. */
	private Integer travelMinutes;
	/** Выбранный способ добраться. */
	@Enumerated(EnumType.STRING)
	@Column(length = 20)
	private TravelMode travelMode;
}
