package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Фото в посте: своё загруженное или из альбома этой встречи")
public record BlogPhotoRequest(
		@Schema(description = "Файл (id)", requiredMode = REQUIRED) @NotNull(message = "Не указано фото") UUID fileId,
		@Schema(description = "Подпись под фото", example = "Старт у таблички с картой острова")
		@Size(max = 300, message = "Подпись не длиннее 300 символов") String caption) {
}
