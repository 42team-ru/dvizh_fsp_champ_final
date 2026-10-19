package com.hackathon.app.domain.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;
/** Сигнал перечитать входящие; сообщения возвращает отдельная ручка списка. */
public record NotificationPollResponse(@Schema(requiredMode = REQUIRED) boolean changed, @Schema(requiredMode = REQUIRED) long revision, @Schema(requiredMode = REQUIRED) long unreadCount) {}
