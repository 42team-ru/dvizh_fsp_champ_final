package com.hackathon.app.domain.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;
import java.time.Instant;
/** Одноразовая ссылка; её нельзя логировать. */
public record TelegramLinkResponse(@Schema(requiredMode = REQUIRED) String url, @Schema(requiredMode = REQUIRED) Instant expiresAt) {}
