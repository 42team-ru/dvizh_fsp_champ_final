package com.hackathon.app.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Новое имя питомца; нормализация и проверка длины выполняются сервисом. */
public record PetRenameRequest(
        /** Имя питомца: от 1 до 30 символов после нормализации пробелов. */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name) {
}
