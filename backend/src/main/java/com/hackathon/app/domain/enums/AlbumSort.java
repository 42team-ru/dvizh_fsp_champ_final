package com.hackathon.app.domain.enums;

/** Порядок фото в альбоме. */
public enum AlbumSort {
	/** Сначала недавно добавленные. */
	NEWEST,
	/** Сначала давно добавленные. */
	OLDEST,
	/** По дате мероприятия: сначала последние встречи. */
	EVENT_NEWEST,
	/** По дате мероприятия: сначала первые встречи. */
	EVENT_OLDEST
}
