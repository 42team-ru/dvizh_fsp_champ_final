package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Автор блога: «Авторы недели»")
public record BlogAuthorResponse(
		@Schema(requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "Организация, если пишет её аккаунт") OrganizationShortResponse organization,
		@Schema(description = "Опубликованных постов всего", requiredMode = REQUIRED) long postsCount) {
}
