package com.hackathon.app.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Виды наград организации. Монет и вещей за них нет, только бейдж на публичной странице. */
@Getter
@RequiredArgsConstructor
public enum OrganizationAwardKind {
	/** Первая встреча, на которую пришли люди. */
	FIRST_MEETING("Первая встреча", "Провела первую встречу, на которую пришли люди", 1),
	/** Суммарно 100 пришедших на встречи. */
	PARTICIPANTS_100("100 участников", "Суммарно 100 пришедших на её встречи", 100),
	/** 20 разных людей пришли повторно. */
	RETURNING_20("Возвращаются снова", "20 разных людей пришли к ней повторно", 20),
	/** Победитель месяца; подтверждает админ. */
	ORG_OF_MONTH("Организация месяца", "Победитель месяца по числу пришедших и вернувшихся участников", 0);

	/** Название бейджа. */
	private final String title;
	/** Условие. */
	private final String description;
	/** Цель прогресса у вех; у «Организации месяца» 0. */
	private final int goal;
}
