package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;
import java.util.UUID;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Организация месяца для блока в ленте")
public record FeaturedOrganizationResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(requiredMode = REQUIRED) String name,
		@Schema(description = "Город") String city,
		@Schema(description = "Адрес логотипа; null — без логотипа") String logoUrl,
		@Schema(description = "Первый день месяца награды", requiredMode = REQUIRED) LocalDate period) {
}
