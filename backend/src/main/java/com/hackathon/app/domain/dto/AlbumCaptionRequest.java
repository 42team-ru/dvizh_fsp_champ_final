package com.hackathon.app.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "Подпись к фото альбома")
public record AlbumCaptionRequest(
		@Schema(description = "Подпись; пустая стирает", example = "Финиш у моста")
		@Size(max = 300, message = "Подпись не длиннее 300 символов") String caption) {
}
