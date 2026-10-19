package com.hackathon.app.domain.enums;

/** За что строка в журнале монет. */
public enum LedgerKind {
	/** Участие во встрече. */
	MEETING,
	/** Первая встреча на платформе. */
	FIRST_MEETING,
	/** Проведённая встреча организатора-человека. */
	ORGANIZER_MEETING,
	/** Первая проведённая встреча. */
	FIRST_ORGANIZED,
	/** Награда за достижение. */
	ACHIEVEMENT,
	/** Покупка вещи (расход). */
	PURCHASE,
	/** Ручная корректировка баланса (демо-данные). */
	ADJUSTMENT
}
