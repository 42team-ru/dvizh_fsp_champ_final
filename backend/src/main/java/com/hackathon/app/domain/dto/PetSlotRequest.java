package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Новый слот одежды бобра (атрибут)")
public record PetSlotRequest(
		@Schema(description = "Код: латиница в нижнем регистре, цифры, дефис; потом не меняется", example = "gloves",
				requiredMode = REQUIRED)
		@NotBlank(message = "Укажите код слота")
		@Pattern(regexp = "[a-z][a-z0-9-]{1,39}", message = "Код слота: 2–40 символов, латиница в нижнем регистре, цифры и дефис, начинается с буквы")
		String code,
		@Schema(description = "Подпись", example = "Перчатки", requiredMode = REQUIRED)
		@NotBlank(message = "Укажите подпись слота") @Size(max = 100) String label) {
}
