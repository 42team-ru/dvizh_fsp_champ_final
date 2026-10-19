package com.hackathon.app.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/** Подпись к фото; пустая стирает. */
@Schema(description = "Подпись к фото альбома")
public record AlbumCaptionRequest(
		@Schema(description = "Подпись; пусто — без подписи", example = "Финиш у моста") @Size(max = 300) String caption) {
}
