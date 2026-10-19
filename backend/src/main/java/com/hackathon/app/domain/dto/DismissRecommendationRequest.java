package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.DismissReason;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** «Не интересно» с причиной. */
@Schema(description = "Скрыть мероприятие из подборки")
public record DismissRecommendationRequest(
		@Schema(description = "NOT_MY_SPORT — ещё и реже показывать этот вид спорта", requiredMode = REQUIRED)
		@NotNull DismissReason reason) {
}
