package com.hackathon.app.domain.dto;

import java.util.UUID;

import com.hackathon.app.domain.enums.SportLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

/** Вид спорта в профиле: из справочника (sportId) или свой (sportName) — ровно одно из двух. */
@Schema(description = "Вид спорта в профиле: sportId из справочника или sportName — свой вид")
public record UserSportRequest(
		@Schema(description = "Вид спорта из справочника") UUID sportId,
		@Schema(description = "Свой вид, если его нет в справочнике; создаётся автоматически", example = "Падел")
		@Size(max = 100) String sportName,
		@Schema(description = "Уровень; не указан — подходят мероприятия любого уровня") SportLevel level) {
}
