package com.hackathon.app.domain.enums;

/** Статус приглашения в соорганизаторы. */
public enum OrganizerInviteStatus {
	/** Ждёт ответа приглашённого. */
	PENDING,
	/** Принято: человек стал соорганизатором. */
	ACCEPTED,
	/** Приглашённый отказался. */
	DECLINED,
	/** Автор отозвал приглашение. */
	CANCELLED
}
