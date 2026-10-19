package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.hackathon.app.domain.enums.NotificationType;
import io.swagger.v3.oas.annotations.media.Schema;

/** Сколько непрочитанных уведомлений этого типа: для счётчиков на вкладках активности. */
@Schema(description = "Непрочитанные уведомления одного типа")
public record NotificationTypeCountResponse(
		@Schema(requiredMode = REQUIRED) NotificationType type,
		@Schema(description = "Непрочитанных", requiredMode = REQUIRED) long unread) {
}
