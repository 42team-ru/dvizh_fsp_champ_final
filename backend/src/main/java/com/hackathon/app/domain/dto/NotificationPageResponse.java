package com.hackathon.app.domain.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;
import java.util.List;
/** Страница входящих и согласованный счётчик. */
public record NotificationPageResponse(@Schema(requiredMode = REQUIRED) List<NotificationResponse> items, String nextCursor, @Schema(requiredMode = REQUIRED) long unreadCount, @Schema(requiredMode = REQUIRED) long revision) {}
