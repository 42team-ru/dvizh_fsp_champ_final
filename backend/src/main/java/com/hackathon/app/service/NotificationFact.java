package com.hackathon.app.service;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import com.hackathon.app.domain.enums.*;

/** Неизменяемый факт для транзакционной рассылки; приватные поля сюда не передаются. */
public record NotificationFact(String key, Set<UUID> recipients, UUID actorId, NotificationType type,
        NotificationCategory category, String title, String body, String targetPath, UUID eventId,
        UUID occurrenceId, UUID organizationId, Instant expectedStartAt) {}
