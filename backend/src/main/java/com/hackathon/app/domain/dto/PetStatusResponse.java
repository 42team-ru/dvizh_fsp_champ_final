package com.hackathon.app.domain.dto;

import java.util.UUID;
import io.swagger.v3.oas.annotations.media.Schema;
import com.hackathon.app.domain.enums.PetMood;
import com.hackathon.app.domain.enums.PetStatusReason;

/** Личное состояние бобра, доступное только владельцу. */
public record PetStatusResponse(
        /** Вычисленное настроение. */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) PetMood mood,
        /** Короткая фраза бобра. */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String message,
        /** Правило, определившее состояние. */
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) PetStatusReason reason,
        /** Связанная встреча; null для общего состояния. */
        @Schema(types = {"string", "null"}, format = "uuid", requiredMode = Schema.RequiredMode.REQUIRED) UUID eventId,
        /** Название связанной встречи; null для общего состояния. */
        @Schema(types = {"string", "null"}, requiredMode = Schema.RequiredMode.REQUIRED) String eventTitle) {
}
