package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.hackathon.app.domain.enums.PetSlotKind;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Слот бобра с вещами")
public record PetSlotResponse(
		/** Стабильный код слота. */
		@Schema(description = "Код слота: activity или ключ в outfit", example = "hat", requiredMode = REQUIRED) String id,
		/** Подпись для конструктора. */
		@Schema(description = "Подпись", example = "Головной убор", requiredMode = REQUIRED) String label,
		/** Тип сохраняемого оборудования. */
		@Schema(description = "ACTIVITY — поле activity, OUTFIT — ключ в outfit", requiredMode = REQUIRED)
		PetSlotKind kind,
		/** Слот из встроенного гардероба. */
		@Schema(description = "Встроенный слот", requiredMode = REQUIRED) boolean builtIn,
		/** Допустимые вещи в порядке конструктора. */
		@Schema(description = "Вещи по порядку", requiredMode = REQUIRED) List<PetItemResponse> items) {
}
