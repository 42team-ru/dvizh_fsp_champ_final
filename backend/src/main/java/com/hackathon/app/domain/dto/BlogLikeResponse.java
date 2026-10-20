package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Лайки поста после нажатия")
public record BlogLikeResponse(
		@Schema(description = "Лайков", requiredMode = REQUIRED) long likesCount,
		@Schema(description = "Я лайкнул", requiredMode = REQUIRED) boolean likedByMe) {
}
