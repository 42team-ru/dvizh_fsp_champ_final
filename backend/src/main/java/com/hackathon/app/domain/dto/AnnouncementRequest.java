package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Объявление организатора участникам: закрепляется вверху карточки и приходит уведомлением")
public record AnnouncementRequest(
		@Schema(description = "Текст", example = "Переносим начало на 20:00, встречаемся у южного входа", requiredMode = REQUIRED)
		@NotBlank(message = "Напишите объявление") @Size(max = 1000, message = "Объявление длиннее 1000 символов") String text) {
}
