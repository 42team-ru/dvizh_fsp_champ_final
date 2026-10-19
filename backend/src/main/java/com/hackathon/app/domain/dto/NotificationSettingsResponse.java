package com.hackathon.app.domain.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;
import java.util.Set;
import java.util.List;
import com.hackathon.app.domain.enums.*;
/** Настройки и доступность транспортов. reminders читается из helpers.reminders. */
public record NotificationSettingsResponse(@Schema(requiredMode = REQUIRED) Set<NotificationChannel> channels, @Schema(requiredMode = REQUIRED) Set<NotificationCategory> categories,
        @Schema(requiredMode = REQUIRED) boolean reminders, @Schema(requiredMode = REQUIRED) List<Channel> availableChannels) {
    /** Режим канала: REAL либо MOCK. */
    public record Channel(@Schema(requiredMode = REQUIRED) NotificationChannel channel, @Schema(requiredMode = REQUIRED) String mode, @Schema(requiredMode = REQUIRED) boolean available, @Schema(requiredMode = REQUIRED) boolean connected) {}
}
