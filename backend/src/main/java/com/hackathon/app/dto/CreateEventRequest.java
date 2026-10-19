package com.hackathon.app.dto;

import java.time.Instant;

import com.hackathon.app.entity.Event;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Офлайн-мероприятию нужен адрес (координаты по желанию), онлайн — описание места/ссылка в locationNote.
 * level по умолчанию ANY, joinMode по умолчанию FREE; capacity пусто = без лимита мест.
 */
public record CreateEventRequest(
		@NotBlank @Size(max = 200) String title,
		@Size(max = 5000) String description,
		@NotNull Long sportId,
		@NotNull @Future Instant startAt,
		Instant endAt,
		@NotNull Boolean offlineMode,
		@Size(max = 500) String address,
		@Size(max = 1000) String locationNote,
		@DecimalMin("-90") @DecimalMax("90") Double latitude,
		@DecimalMin("-180") @DecimalMax("180") Double longitude,
		Event.Level level,
		Event.Format format,
		@Size(max = 2000) String requirements,
		@Size(max = 2000) String equipment,
		@Min(1) @Max(10000) Integer capacity,
		Event.JoinMode joinMode) {
}
