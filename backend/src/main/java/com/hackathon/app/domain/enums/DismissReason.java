package com.hackathon.app.domain.enums;

/** Почему рекомендация не подошла. */
public enum DismissReason {
	/** Просто не интересно: скрыть это событие. */
	NOT_INTERESTED,
	/** Не мой вид спорта: скрыть и реже показывать этот вид. */
	NOT_MY_SPORT,
	/** Слишком далеко. */
	TOO_FAR,
	/** Неудобное время. */
	BAD_TIME
}
