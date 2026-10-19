package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Объединение вида спорта с другим: мероприятия и интересы переходят в целевой вид")
public record MergeSportRequest(
		@Schema(description = "В какой вид переносим", requiredMode = REQUIRED) @NotNull UUID targetId,
		@Schema(description = "Причина; без неё подставляется «Дубликат вида …»", example = "Дубликат вида «Сёрфинг»")
		@Size(max = 1000) String reason) {
}
