package com.hackathon.app.domain.enums;

/** Системная роль аккаунта; попадает в JWT-клейм role. */
public enum SystemRole {
	/** Отдельный человек. */
	USER,
	/** Аккаунт клуба, кружка, федерации или компании. */
	ORG,
	/** Администратор платформы. */
	ADMIN
}
