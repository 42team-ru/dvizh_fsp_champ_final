package com.hackathon.app.domain.enums;

/** Уровень подготовки пользователя в виде спорта. */
public enum SportLevel {
	/** Новичок. */
	BEGINNER,
	/** Любитель. */
	AMATEUR,
	/** Профи. */
	PRO;

	/** Тот же уровень в терминах мероприятия. */
	public EventLevel toEventLevel() {
		return EventLevel.valueOf(name());
	}
}
