package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

/** Один каталог и для конструктора, и для проверки образа на сервере. */
@Schema(description = "Каталог бобра: слоты по порядку конструктора, в каждом — вещи")
public record PetCatalogResponse(
		@Schema(requiredMode = REQUIRED) List<PetSlotResponse> slots) {
}
