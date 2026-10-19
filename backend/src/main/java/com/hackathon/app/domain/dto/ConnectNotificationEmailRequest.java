package com.hackathon.app.domain.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Адрес демонстрационного почтового канала. */
public record ConnectNotificationEmailRequest(
        @NotBlank(message = "Неверный адрес почты") @Email(message = "Неверный адрес почты")
        @Size(max = 254, message = "Неверный адрес почты") String email) {}
