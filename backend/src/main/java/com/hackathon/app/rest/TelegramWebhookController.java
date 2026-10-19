package com.hackathon.app.rest;

import com.hackathon.app.domain.dto.TelegramUpdateRequest;
import com.hackathon.app.service.TelegramService;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

/** Технический webhook: отдельный секрет вместо пользовательского JWT. Не входит в клиент фронта. */
@Hidden
@Tag(name = "telegram", description = "Технический webhook Telegram")
@Slf4j
@RestController
@RequiredArgsConstructor
class TelegramWebhookController {
    private final TelegramService telegram;
    @PostMapping(path = "/api/notifications/telegram/webhook", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "telegram_webhook", hidden = true)
    Ack accept(@RequestHeader(name = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
               @RequestBody TelegramUpdateRequest update) {
        log.info("Endpoint called: POST /api/notifications/telegram/webhook, updateId={}", update.updateId());
        telegram.accept(secret, update);
        log.info("Endpoint response: POST /api/notifications/telegram/webhook, updateId={}", update.updateId());
        return new Ack(true);
    }
    /** Подтверждение обработки update. */
    record Ack(boolean ok) {}
}
