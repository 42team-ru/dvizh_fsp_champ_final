package com.hackathon.app.dto;

import java.util.UUID;

/** Публичная карточка человека (организатор, участник): без email и прочих личных данных. */
public record UserShortResponse(UUID id, String username, String firstName, String lastName) {
}
