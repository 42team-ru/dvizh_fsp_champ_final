package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.Map;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Полная замена образа: чего нет в outfit — снимается. */
@Schema(description = "Полная замена образа бобра")
public record PetRequest(
		/** Выбранный инвентарь. */
		@Schema(description = "Инвентарь; none — без инвентаря", example = "hockey", requiredMode = REQUIRED)
		@NotNull(message = "Укажите инвентарь (none — без инвентаря)") String activity,
		/** Надетые вещи по слотам. */
		@Schema(description = "Код слота → код вещи. Чтобы снять вещь, не передавайте слот (null тоже снимает)",
				example = "{\"shirt\": \"hc-sokol\", \"hat\": \"helmet\"}", requiredMode = REQUIRED)
		@NotNull(message = "Передайте outfit (пустой объект — ничего не надето)") Map<String, String> outfit) {
}
