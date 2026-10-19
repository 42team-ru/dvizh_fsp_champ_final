package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.hackathon.app.domain.enums.PetSlotKind;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Слот бобра с вещами")
public record PetSlotResponse(
		@Schema(description = "Код слота: mood, activity или ключ в outfit", example = "hat", requiredMode = REQUIRED) String id,
		@Schema(description = "Подпись", example = "Головной убор", requiredMode = REQUIRED) String label,
		@Schema(description = "MOOD — поле mood, ACTIVITY — поле activity, OUTFIT — ключ в outfit", requiredMode = REQUIRED)
		PetSlotKind kind,
		@Schema(description = "Встроенный слот", requiredMode = REQUIRED) boolean builtIn,
		@Schema(description = "Вещи по порядку", requiredMode = REQUIRED) List<PetItemResponse> items) {
}
