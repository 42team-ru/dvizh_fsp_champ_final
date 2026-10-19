package com.hackathon.app.domain.dto;
import java.util.Set;
import com.hackathon.app.domain.enums.*;
import jakarta.validation.constraints.NotNull;
/** Полная замена внешних каналов и категорий; внутренние сообщения не отключаются. */
public record SaveNotificationSettingsRequest(@NotNull Set<@NotNull NotificationChannel> channels,
        @NotNull Set<@NotNull NotificationCategory> categories) {}
