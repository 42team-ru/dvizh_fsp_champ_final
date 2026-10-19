package com.hackathon.app.domain.dto;

import java.util.List;
import java.util.Map;
import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/** Комплект с персональной ценой и доступностью. */
public record ShopBundleResponse(
		/** Код комплекта. */
		@Schema(description = "Код комплекта.", requiredMode = REQUIRED) String code,
		/** Название комплекта. */
		@Schema(description = "Название комплекта.", requiredMode = REQUIRED) String label,
		/** Спортивная категория. */
        @Schema(description = "Спортивная категория.", requiredMode = REQUIRED) BundleCategoryResponse category,
		/** Полный образ: слот → вещь. */
		@Schema(description = "Полный образ: слот → вещь.", requiredMode = REQUIRED) Map<String, String> outfit,
		/** Инвентарь или none. */
		@Schema(description = "Инвентарь или none.", requiredMode = REQUIRED) String activity,
		/** Вещи комплекта без пустого инвентаря. */
		@Schema(description = "Вещи комплекта без пустого инвентаря.", requiredMode = REQUIRED) List<ShopItemResponse> items,
		/** Цена недостающих вещей до скидки. */
		@Schema(description = "Цена недостающих вещей до скидки.", requiredMode = REQUIRED) int fullPrice,
		/** Цена недостающих вещей со скидкой 20% при двух и более. */
		@Schema(description = "Цена недостающих вещей со скидкой 20% при двух и более.", requiredMode = REQUIRED) int price,
		/** Количество недостающих вещей. */
		@Schema(description = "Количество недостающих вещей.", requiredMode = REQUIRED) int missingCount,
		/** Все вещи уже принадлежат пользователю. */
		@Schema(description = "Все вещи уже принадлежат пользователю.", requiredMode = REQUIRED) boolean owned,
		/** Есть недоступный эксклюзив. */
		@Schema(description = "Есть недоступный эксклюзив.", requiredMode = REQUIRED) boolean locked,
		/** Как получить недостающий эксклюзив. */
		@Schema(description = "Как получить недостающий эксклюзив.") String lockedReason) {}
