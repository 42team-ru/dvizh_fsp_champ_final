package com.hackathon.app.domain.enums;

/** Статус награды «Организация месяца». */
public enum AwardStatus {
	/** Предложена сервером, ждёт подтверждения админа. */
	PROPOSED,
	/** Подтверждена админом: бейдж и блок в ленте. */
	CONFIRMED
}
