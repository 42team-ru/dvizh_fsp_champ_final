package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Кошелёк и прогресс бобра")
public record WalletResponse(
		@Schema(description = "Баланс монет", example = "180", requiredMode = REQUIRED) int coins,
		@Schema(description = "Уровень: 1 плюс одна ступень за каждые 5 засчитанных встреч (проведённая считается за две)",
				example = "4", requiredMode = REQUIRED) int level,
		@Schema(description = "Засчитанных встреч всего с учётом двойного веса проведённых", example = "17", requiredMode = REQUIRED) int countedMeetings,
		@Schema(description = "Энергия: засчитанные встречи за последние 7 дней", example = "3", requiredMode = REQUIRED) int energy,
		@Schema(description = "Максимум энергии", example = "5", requiredMode = REQUIRED) int energyMax,
		@Schema(description = "Последние 20 операций, свежие сверху", requiredMode = REQUIRED) List<WalletEntryResponse> entries) {
}
