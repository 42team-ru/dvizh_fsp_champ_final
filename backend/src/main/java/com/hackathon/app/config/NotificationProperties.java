package com.hackathon.app.config;

import java.net.URI;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Конфигурация обработчиков и Telegram; секреты не должны попадать в логи. */
@ConfigurationProperties("app.notifications")
public record NotificationProperties(@DefaultValue("true") boolean schedulingEnabled,
        @DefaultValue("30") int retentionDays, @DefaultValue("300") int reminderGraceSeconds,
        @DefaultValue({"1440", "60"}) List<Integer> reminderOffsetsMinutes,
        @DefaultValue("http://localhost:5173") URI publicUrl, @DefaultValue("Asia/Krasnoyarsk") String timeZone,
        @DefaultValue Telegram telegram) {
    /** Настройки транспорта Telegram. */
    public record Telegram(@DefaultValue("false") boolean enabled, @DefaultValue("") String token,
            @DefaultValue("") String username, @DefaultValue("") String webhookSecret,
            @DefaultValue("https://api.telegram.org") URI apiUrl) {
        @Override public String toString() { return "Telegram[enabled=" + enabled + "]"; }
    }
    public NotificationProperties {
        if (retentionDays < 1 || reminderGraceSeconds < 0 || reminderOffsetsMinutes.stream().anyMatch(n -> n < 1))
            throw new IllegalArgumentException("Некорректные интервалы уведомлений");
        if (telegram.enabled() && (telegram.token().isBlank() || telegram.username().isBlank() || telegram.webhookSecret().isBlank()))
            throw new IllegalArgumentException("Для Telegram нужны token, username и webhook-secret");
    }
}
