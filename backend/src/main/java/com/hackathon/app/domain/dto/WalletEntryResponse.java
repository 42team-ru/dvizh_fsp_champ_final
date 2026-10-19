package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.LedgerKind;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Операция в журнале монет")
public record WalletEntryResponse(
		@Schema(requiredMode = REQUIRED) UUID id,
		@Schema(description = "Монеты: плюс — начисление, минус — трата", example = "10", requiredMode = REQUIRED) int amount,
		@Schema(description = "За что", requiredMode = REQUIRED) LedgerKind kind,
		@Schema(description = "Подпись для человека", example = "Встреча", requiredMode = REQUIRED) String note,
		@Schema(description = "Мероприятие, за которое начислено; null — не про встречу") UUID eventId,
		@Schema(description = "Название мероприятия; null — не про встречу") String eventTitle,
		@Schema(description = "Когда произошло", requiredMode = REQUIRED) Instant occurredAt) {
}
