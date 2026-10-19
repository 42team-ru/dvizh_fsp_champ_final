package com.hackathon.app.dto;

import com.hackathon.app.entity.Registration;
import jakarta.validation.constraints.NotNull;

/** Решение организатора: только CONFIRMED или REJECTED. Можно менять сколько угодно раз (исправить ошибку). */
public record DecideRegistrationRequest(@NotNull Registration.Status status) {
}
