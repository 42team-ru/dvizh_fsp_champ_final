package com.hackathon.app.dto;

import java.util.UUID;

/** Публичная карточка участника: без email и прочих личных данных. */
public record ParticipantResponse(UUID id, String username, String firstName, String lastName) {
}
