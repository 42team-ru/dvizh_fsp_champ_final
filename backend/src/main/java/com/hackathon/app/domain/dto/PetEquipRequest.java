package com.hackathon.app.domain.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Надеть вещь в один слот или снять её")
public record PetEquipRequest(
		@Schema(description = "Код вещи из этого слота; null — снять (настроение станет idle, инвентарь — none)",
				example = "helmet")
		String item) {
}
