package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.SportStatus;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Вид спорта в админке: статус модерации, картинка и сколько мероприятий на него опираются")
public record AdminSportResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Название", example = "Петанк", requiredMode = REQUIRED) String name,
		@Schema(description = "Код для URL", example = "petank", requiredMode = REQUIRED) String slug,
		@Schema(description = "Добавлен пользователем, а не админом или из исходного набора", requiredMode = REQUIRED) boolean custom,
		@Schema(description = "Состояние в справочнике", requiredMode = REQUIRED) SportStatus status,
		@Schema(description = "Есть ли своя картинка; false — в интерфейсе показывается заглушка", requiredMode = REQUIRED) boolean hasImage,
		@Schema(description = "Картинка загружена админом (её можно убрать); false — встроенная или нет вовсе", requiredMode = REQUIRED) boolean imageUploaded,
		@Schema(description = "Ссылка на картинку; null, если своей картинки нет") String imageUrl,
		@Schema(description = "Точка фокуса картинки", requiredMode = REQUIRED) FocusPoint imageFocus,
		@Schema(description = "Мероприятий с этим видом (во всех статусах)", requiredMode = REQUIRED) long eventsCount,
		@Schema(description = "Кто предложил свой вид; null — из справочника или добавлен админом") UserShortResponse proposedBy,
		@Schema(description = "Причина отключения или слияния") String moderationReason,
		@Schema(description = "Название вида, с которым объединён; только у MERGED") String mergedIntoName,
		@Schema(description = "Когда админ принял решение") Instant moderatedAt,
		@Schema(requiredMode = REQUIRED) Instant createdAt) {
}
