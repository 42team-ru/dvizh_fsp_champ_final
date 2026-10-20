package com.hackathon.app.domain.enums;

/** Опубликован пост или ещё черновик. */
public enum BlogPostStatus {
	/** Черновик: видит только автор. */
	DRAFT,
	/** Опубликован: виден всем вошедшим в блоге, на странице встречи и в профиле. */
	PUBLISHED
}
