package com.hackathon.app.domain.dto;
import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;
/** Состояние собственного подключения; внутренние идентификаторы чата не раскрываются. */
public record TelegramConnectionResponse(@Schema(requiredMode = REQUIRED) boolean available, @Schema(requiredMode = REQUIRED) boolean connected, String username) {}
