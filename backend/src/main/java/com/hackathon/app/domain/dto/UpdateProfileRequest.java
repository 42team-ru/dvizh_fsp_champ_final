package com.hackathon.app.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Правка своего профиля: все поля целиком, пустые bio и city стирают значение. */
@Schema(description = "Профиль целиком: имя, фамилия, город, о себе")
public record UpdateProfileRequest(
		@Schema(description = "Имя", example = "Анна") @NotBlank @Size(min = 2, max = 100) String firstName,
		@Schema(description = "Фамилия", example = "Смирнова") @NotBlank @Size(min = 2, max = 100) String lastName,
		@Schema(description = "Город", example = "Красноярск") @Size(max = 100) String city,
		@Schema(description = "О себе", example = "Бегаю по утрам, хочу попробовать йогу") @Size(max = 1000) String bio) {
}
