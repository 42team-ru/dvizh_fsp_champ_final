package com.hackathon.app.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Телефон MAX; формат и нормализация проверяются сервисом. */
public record ConnectNotificationMaxRequest(
        @NotBlank(message = "Неверный номер телефона")
        @Size(max = 64, message = "Неверный номер телефона") String phone) {}
