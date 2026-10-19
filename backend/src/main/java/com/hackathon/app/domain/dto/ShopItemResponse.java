package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.PetItemKind;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Вещь бобра в магазине с ценой и признаком «моя»")
public record ShopItemResponse(
		@Schema(description = "Идентификатор для покупки: слот:код", example = "hat:cap", requiredMode = REQUIRED) String id,
		@Schema(description = "Код слота для pets_equip", example = "hat", requiredMode = REQUIRED) String slot,
		@Schema(description = "Код вещи для pets_equip", example = "cap", requiredMode = REQUIRED) String code,
		@Schema(description = "Подпись", example = "Кепка", requiredMode = REQUIRED) String label,
		@Schema(description = "Цена в монетах; 0 у базовых и эксклюзивов", example = "60", requiredMode = REQUIRED) int price,
		@Schema(description = "Базовая, магазин или эксклюзив", requiredMode = REQUIRED) PetItemKind kind,
		@Schema(description = "Вещь уже у пользователя и её можно надеть", requiredMode = REQUIRED) boolean owned,
		@Schema(description = "У эксклюзива — за что дают, например «Дают за 10 встреч»; иначе null") String hint,
        @Schema(description = "Вещь последней волны каталога", requiredMode = REQUIRED) boolean isNew,
        @Schema(description = "Эксклюзив за достижение", requiredMode = REQUIRED) boolean legendary) {
}
