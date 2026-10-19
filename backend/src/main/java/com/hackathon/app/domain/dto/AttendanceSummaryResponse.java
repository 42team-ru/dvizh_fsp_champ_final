package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Сводка истории посещений: всего и по видам спорта")
public record AttendanceSummaryResponse(
		@Schema(description = "Всего посещений", example = "27", requiredMode = REQUIRED) long total,
		@Schema(description = "По видам спорта, самые частые первыми", requiredMode = REQUIRED)
		List<SportAttendanceResponse> bySport) {
}
