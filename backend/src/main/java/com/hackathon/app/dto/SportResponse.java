package com.hackathon.app.dto;

import java.util.UUID;

/** custom — вид добавлен пользователем. */
public record SportResponse(UUID id, String name, String slug, boolean custom) {
}
