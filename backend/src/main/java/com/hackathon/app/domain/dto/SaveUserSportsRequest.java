package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Виды спорта профиля целиком: что не передано — убирается; пустой список очищает. */
@Schema(description = "Виды спорта профиля целиком; пустой список очищает")
public record SaveUserSportsRequest(
		@Schema(requiredMode = REQUIRED) @NotNull @Size(max = 30) List<@Valid @NotNull UserSportRequest> sports) {
}
