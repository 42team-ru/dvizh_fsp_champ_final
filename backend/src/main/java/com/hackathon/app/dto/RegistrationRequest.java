package com.hackathon.app.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "Запись на мероприятие; тело можно не передавать")
public record RegistrationRequest(
		@Schema(description = "Сообщение организатору (для записи по заявке)", example = "Играю два года, возьму свой мяч")
		@Size(max = 1000) String message) {
}
