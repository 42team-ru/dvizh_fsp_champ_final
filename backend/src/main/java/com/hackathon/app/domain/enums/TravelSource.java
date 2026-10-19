package com.hackathon.app.domain.enums;

/** Откуда время в пути. */
public enum TravelSource {
	/** Маршрут 2ГИС с учётом улиц и расписания транспорта. */
	ROUTE,
	/** Оценка по прямому расстоянию: 2ГИС недоступен или ключ не задан. */
	ESTIMATE
}
