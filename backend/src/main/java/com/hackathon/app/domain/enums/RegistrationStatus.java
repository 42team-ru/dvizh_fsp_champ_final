package com.hackathon.app.domain.enums;

/** Статус записи на мероприятие. */
public enum RegistrationStatus {
	/** Подтверждена: участник занимает место. */
	CONFIRMED,
	/** Заявка ждёт решения организатора. */
	PENDING,
	/** Отклонена организатором. */
	REJECTED,
	/** Отменена самим участником. */
	CANCELLED
}
