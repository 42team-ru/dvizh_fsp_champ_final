package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Пост целиком: текст, фото, виджет и мои права")
public record BlogPostResponse(
		@Schema(description = "То же, что в списке", requiredMode = REQUIRED) BlogPostSummaryResponse post,
		@Schema(description = "Текст в Markdown", requiredMode = REQUIRED) String body,
		@Schema(description = "Фото по порядку, первое — обложка", requiredMode = REQUIRED) List<BlogPhotoResponse> photos,
		@Schema(description = "Виджет «Наши тренировки»; null — автор его не добавил") BlogWidgetResponse widget,
		@Schema(description = "Виджет: организация (для формы правки)") UUID widgetOrganizationId,
		@Schema(description = "Виджет: организатор-человек (для формы правки)") UUID widgetUserId,
		@Schema(description = "Комментарии разрешены", requiredMode = REQUIRED) boolean commentsEnabled,
		@Schema(requiredMode = REQUIRED) BlogViewerResponse viewer) {
}
