package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.enums.BlogPostType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Пост целиком: создание и правка заменяют все поля")
public record BlogPostRequest(
		@Schema(description = "Гайд или пост с тренировки", requiredMode = REQUIRED)
		@NotNull(message = "Выбери, что пишем: гайд или пост с тренировки") BlogPostType type,
		@Schema(description = "Встреча (обязательна для поста с тренировки, у гайда не хранится)")
		UUID eventId,
		@Schema(description = "Вид спорта гайда; у поста с тренировки берётся вид встречи")
		UUID sportId,
		@Schema(description = "Заголовок", example = "Первые 8 км вокруг Татышева", requiredMode = REQUIRED)
		@NotBlank(message = "Напиши заголовок") @Size(max = 120, message = "Заголовок не длиннее 120 символов") String title,
		@Schema(description = "Текст в Markdown", requiredMode = REQUIRED)
		@NotBlank(message = "Напиши хотя бы пару строк") @Size(max = 20000, message = "Текст не длиннее 20 000 символов") String body,
		@Schema(description = "Фото по порядку, первое — обложка; до 10")
		@Size(max = 10, message = "Не больше 10 фото в посте") List<@Valid BlogPhotoRequest> photos,
		@Schema(description = "Виджет в конце поста: ближайшие встречи этой организации")
		UUID widgetOrganizationId,
		@Schema(description = "Виджет в конце поста: ближайшие встречи этого организатора")
		UUID widgetUserId,
		@Schema(description = "Разрешить комментарии; по умолчанию да")
		Boolean commentsEnabled,
		@Schema(description = "true — опубликовать, false — сохранить черновиком", requiredMode = REQUIRED)
		@NotNull(message = "Укажи: публикуем или сохраняем черновик") Boolean publish) {
}
