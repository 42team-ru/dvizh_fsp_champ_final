package com.hackathon.app.domain.enums;

/** Тип аккаунта при регистрации; по умолчанию USER. ADMIN через API не создаётся. */
public enum AccountType {
	/** Отдельный человек. */
	USER,
	/** Организация: клуб, кружок, федерация, компания. */
	ORG
}
