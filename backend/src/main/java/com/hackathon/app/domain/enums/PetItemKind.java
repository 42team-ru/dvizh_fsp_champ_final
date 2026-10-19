package com.hackathon.app.domain.enums;

/** Как вещь бобра попадает к пользователю. */
public enum PetItemKind {
	/** Базовая: есть у всех сразу. */
	BASE,
	/** Магазин: покупается за монеты. */
	SHOP,
	/** Эксклюзив: только за достижение, купить нельзя. */
	EXCLUSIVE
}
