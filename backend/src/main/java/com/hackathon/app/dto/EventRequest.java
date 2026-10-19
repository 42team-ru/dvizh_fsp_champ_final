package com.hackathon.app.dto;

import java.time.Instant;
import java.util.UUID;

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
 * Форма создания и редактирования мероприятия (PUT заменяет все поля).
 * Вид спорта: либо sportId из справочника, либо sportName — свой (создастся, если такого ещё нет).
 * Очному нужен address. level по умолчанию ANY, joinMode — FREE, capacity пусто — без лимита.
 */
public record EventRequest(
		@NotBlank @Size(max = 200) String title,
		@Size(max = 5000) String description,
		UUID sportId,
		@Size(max = 100) String sportName,
		@NotNull @Future Instant startAt,
		Instant endAt,
		@NotNull Event.Format format,
		@Size(max = 500) String address,
		@Size(max = 1000) String locationNote,
		@Size(max = 1000) String onlineUrl,
		@DecimalMin("-90") @DecimalMax("90") Double lat,
		@DecimalMin("-180") @DecimalMax("180") Double lon,
		Event.Level level,
		Event.Kind kind,
		@Size(max = 2000) String requirements,
		@Size(max = 2000) String equipment,
		@Min(1) @Max(10000) Integer capacity,
		Event.JoinMode joinMode,
		@Size(max = 2000) String privateDetails) {
}
