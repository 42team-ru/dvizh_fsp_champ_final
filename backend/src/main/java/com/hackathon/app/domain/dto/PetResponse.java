package com.hackathon.app.domain.dto;

import java.util.Map;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.hackathon.app.domain.enums.PetMood;
import io.swagger.v3.oas.annotations.media.Schema;

/** Образ и настроение бобра; личное состояние отдаётся только владельцу. */
public record PetResponse(
        /** Имя питомца; по умолчанию Бублик. */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        /** Настроение, вычисленное сервером; в публичном ответе idle. */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) PetMood mood,
        /** Инвентарь; none — без инвентаря. */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String activity,
        /** Надетые вещи по кодам слотов. */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Map<String, String> outfit,
        /** Личная фраза и её причина; отсутствует в публичном ответе. */
        @JsonInclude(JsonInclude.Include.NON_NULL) PetStatusResponse status) {
}
