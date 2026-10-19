package com.hackathon.app.domain.enums;

/** Статус занятия. */
public enum OccurrenceStatus {
	/** Состоится: попадает в ленту и на карту, на него можно отметиться. */
	SCHEDULED,
	/** Отменено организатором или правкой расписания (необратимо); отметки участников сохраняются. */
	CANCELLED
}
