package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Что я могу сделать с постом: кнопки рисуются по этим флагам")
public record BlogViewerResponse(
		@Schema(description = "Мой пост", requiredMode = REQUIRED) boolean isMine,
		@Schema(description = "Могу править", requiredMode = REQUIRED) boolean canEdit,
		@Schema(description = "Могу удалить (автор или админ)", requiredMode = REQUIRED) boolean canDelete,
		@Schema(description = "Могу лайкнуть", requiredMode = REQUIRED) boolean canLike,
		@Schema(description = "Могу комментировать", requiredMode = REQUIRED) boolean canComment,
		@Schema(description = "Почему нельзя комментировать; null — можно") String commentBlockedReason) {
}
