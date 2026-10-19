package com.hackathon.app.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Достижения пользователя: название, условие, цель прогресса и награда. Награда — монеты или код вещи слот:код. */
@Getter
@RequiredArgsConstructor
public enum AchievementCode {
	/** Первая встреча. */
	FIRST_STEP("Первый шаг", "Сходить на первую встречу", 1, "встреч", 30, null),
	/** Три разных вида спорта. */
	VERSATILE("Разносторонний", "Попробовать 3 разных вида спорта", 3, "видов спорта", 50, null),
	/** Десять встреч. */
	REGULAR("Завсегдатай", "Сходить на 10 встреч", 10, "встреч", 0, "neck:medal"),
	/** Первая проведённая встреча с тремя и более участниками. */
	TEAM_BUILDER("Собрал команду", "Провести встречу, на которую пришли 3 человека и больше", 1, "встреч", 50, null),
	/** Пять проведённых встреч. */
	SOUL_OF_COMPANY("Душа компании", "Провести 5 встреч", 5, "встреч", 0, "hat:crown"),
	/** Встреча организации «Хищные бобры». */
	OWN_BEAVER("Свой бобр", "Сходить на встречу ССК ВГУ «Хищные бобры»", 1, "встреч", 0, "shirt:beavers");

	/** Название. */
	private final String title;
	/** Условие. */
	private final String description;
	/** Сколько нужно для получения. */
	private final int goal;
	/** Единица прогресса в родительном падеже («2 из 3 видов спорта»). */
	private final String unit;
	/** Монеты в награду; 0 — награда вещью. */
	private final int rewardCoins;
	/** Вещь в награду как «слот:код»; null — награда монетами. */
	private final String rewardItem;
}
