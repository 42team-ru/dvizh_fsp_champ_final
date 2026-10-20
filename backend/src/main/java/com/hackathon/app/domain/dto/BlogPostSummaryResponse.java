package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.BlogPostStatus;
import com.hackathon.app.domain.enums.BlogPostType;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Пост в списке: лента блога, профиль, страница встречи и клуба")
public record BlogPostSummaryResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Гайд или пост с тренировки", requiredMode = REQUIRED) BlogPostType type,
		@Schema(description = "Черновик или опубликован", requiredMode = REQUIRED) BlogPostStatus status,
		@Schema(description = "Заголовок", requiredMode = REQUIRED) String title,
		@Schema(description = "Начало текста без разметки", requiredMode = REQUIRED) String excerpt,
		@Schema(description = "Минут чтения", requiredMode = REQUIRED) int readMinutes,
		@Schema(description = "Обложка — первое фото; null — без фото") BlogPhotoResponse cover,
		@Schema(description = "Сколько фото в посте", requiredMode = REQUIRED) int photosCount,
		@Schema(description = "Вид спорта; null — без вида") SportResponse sport,
		@Schema(description = "Встреча; null — у гайда") BlogEventResponse event,
		@Schema(description = "Автор", requiredMode = REQUIRED) UserShortResponse author,
		@Schema(description = "Организация, если пишет её аккаунт") OrganizationShortResponse organization,
		@Schema(description = "Автор был на встрече (участник или организатор) — плашка «был на встрече»", requiredMode = REQUIRED)
		boolean authorWasThere,
		@Schema(description = "Лайков", requiredMode = REQUIRED) long likesCount,
		@Schema(description = "Я лайкнул", requiredMode = REQUIRED) boolean likedByMe,
		@Schema(description = "Комментариев (без удалённых)", requiredMode = REQUIRED) long commentsCount,
		@Schema(description = "Когда опубликован; null — черновик") Instant publishedAt,
		@Schema(requiredMode = REQUIRED) Instant createdAt,
		@Schema(requiredMode = REQUIRED) Instant updatedAt) {
}
