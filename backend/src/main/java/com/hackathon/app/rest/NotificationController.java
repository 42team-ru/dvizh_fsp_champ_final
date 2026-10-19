package com.hackathon.app.rest;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import com.hackathon.app.domain.enums.NotificationType;
import io.swagger.v3.oas.annotations.Parameter;
import com.hackathon.app.domain.dto.*;
import com.hackathon.app.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.media.Content;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.async.DeferredResult;

/** Собственные уведомления доступны аккаунтам всех ролей. */
@RestController
@Slf4j
@RequiredArgsConstructor
@Tag(name = "notifications", description = "Входящие, long polling, внешние каналы и Telegram")
@RequestMapping(path = "/api/notifications", produces = MediaType.APPLICATION_JSON_VALUE)
class NotificationController {
    private final NotificationService notifications;
    private final NotificationLongPolling polling;
    private final TelegramService telegram;

    @GetMapping
    @Operation(operationId = "notifications_list", summary = "Свои уведомления, новые сверху")
    NotificationPageResponse list(@AuthenticationPrincipal Jwt jwt, @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int size, @RequestParam(defaultValue = "false") boolean unreadOnly,
            @Parameter(description = "Только эти типы; пусто — все") @RequestParam(required = false) Set<NotificationType> types) {
        log.info("Endpoint called: GET /api/notifications, userId={}, types={}", jwt.getSubject(), types);
        var response = notifications.list(userId(jwt), cursor, size, unreadOnly, types);
        log.info("Endpoint response: GET /api/notifications, count={}, revision={}", response.items().size(), response.revision());
        return response;
    }

    @GetMapping("/unread-counts")
    @Operation(operationId = "notifications_unreadCounts", summary = "Непрочитанные уведомления по типам")
    List<NotificationTypeCountResponse> unreadCounts(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: GET /api/notifications/unread-counts, userId={}", jwt.getSubject());
        var response = notifications.unreadCounts(userId(jwt));
        log.info("Endpoint response: GET /api/notifications/unread-counts, types={}", response.size());
        return response;
    }

    @GetMapping("/poll")
    @Operation(operationId = "notifications_poll", summary = "Ждать изменения входящих",
            description = "После changed=true перечитайте список. Timeout возвращает 200 с changed=false. Отменяйте запрос при выходе.")
    @ApiResponse(responseCode = "200", content = @Content(schema = @Schema(implementation = NotificationPollResponse.class)))
    DeferredResult<NotificationPollResponse> poll(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") @Min(0) long revision,
            @RequestParam(defaultValue = "25") @Min(0) @Max(30) int timeoutSeconds) {
        log.info("Endpoint called: GET /api/notifications/poll, userId={}, revision={}", jwt.getSubject(), revision);
        var response = polling.poll(userId(jwt), revision, timeoutSeconds);
        response.onCompletion(() -> log.info("Endpoint response: GET /api/notifications/poll, userId={}", jwt.getSubject()));
        return response;
    }

    @PostMapping("/{id}/read")
    @Operation(operationId = "notifications_read", summary = "Прочитать своё уведомление")
    NotificationPollResponse read(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: POST /api/notifications/{}/read, userId={}", id, jwt.getSubject());
        var response = notifications.read(userId(jwt), id);
        log.info("Endpoint response: POST /api/notifications/{}/read, revision={}", id, response.revision());
        return response;
    }

    @PostMapping("/read-all")
    @Operation(operationId = "notifications_readAll", summary = "Прочитать уведомления до показанной ревизии")
    NotificationPollResponse readAll(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ReadNotificationsRequest request) {
        log.info("Endpoint called: POST /api/notifications/read-all, userId={}", jwt.getSubject());
        var response = notifications.readAll(userId(jwt), request.throughRevision());
        log.info("Endpoint response: POST /api/notifications/read-all, revision={}", response.revision());
        return response;
    }

    @GetMapping("/settings")
    @Operation(operationId = "notifications_settings", summary = "Свои настройки уведомлений")
    NotificationSettingsResponse settings(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: GET /api/notifications/settings, userId={}", jwt.getSubject());
        var response = notifications.settings(userId(jwt));
        log.info("Endpoint response: GET /api/notifications/settings, userId={}", jwt.getSubject());
        return response;
    }

    @PutMapping("/settings")
    @Operation(operationId = "notifications_saveSettings", summary = "Заменить настройки внешней доставки")
    NotificationSettingsResponse settings(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SaveNotificationSettingsRequest request) {
        log.info("Endpoint called: PUT /api/notifications/settings, userId={}", jwt.getSubject());
        var response = notifications.saveSettings(userId(jwt), request);
        log.info("Endpoint response: PUT /api/notifications/settings, userId={}", jwt.getSubject());
        return response;
    }

    @PutMapping("/email")
    @Operation(operationId = "notifications_connectEmail", summary = "Подключить почту (демо)")
    NotificationSettingsResponse connectEmail(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ConnectNotificationEmailRequest request) {
        return notifications.connectEmail(userId(jwt), request);
    }

    @DeleteMapping("/email")
    @Operation(operationId = "notifications_disconnectEmail", summary = "Отключить почту")
    NotificationSettingsResponse disconnectEmail(@AuthenticationPrincipal Jwt jwt) {
        return notifications.disconnectEmail(userId(jwt));
    }

    @PutMapping("/max")
    @Operation(operationId = "notifications_connectMax", summary = "Подключить MAX (демо)")
    NotificationSettingsResponse connectMax(@AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody ConnectNotificationMaxRequest request) {
        return notifications.connectMax(userId(jwt), request);
    }

    @DeleteMapping("/max")
    @Operation(operationId = "notifications_disconnectMax", summary = "Отключить MAX")
    NotificationSettingsResponse disconnectMax(@AuthenticationPrincipal Jwt jwt) {
        return notifications.disconnectMax(userId(jwt));
    }

    @GetMapping("/telegram")
    @Operation(operationId = "notifications_telegram", summary = "Состояние подключения Telegram")
    TelegramConnectionResponse telegram(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: GET /api/notifications/telegram, userId={}", jwt.getSubject());
        var response = telegram.connection(userId(jwt));
        log.info("Endpoint response: GET /api/notifications/telegram, userId={}", jwt.getSubject());
        return response;
    }

    @PostMapping("/telegram/link")
    @Operation(operationId = "notifications_telegramLink", summary = "Одноразовая ссылка подключения Telegram")
    TelegramLinkResponse link(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: POST /api/notifications/telegram/link, userId={}", jwt.getSubject());
        var response = telegram.link(userId(jwt));
        log.info("Endpoint response: POST /api/notifications/telegram/link, userId={}", jwt.getSubject());
        return response;
    }

    @DeleteMapping("/telegram")
    @Operation(operationId = "notifications_disconnectTelegram", summary = "Отключить Telegram")
    TelegramConnectionResponse disconnect(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: DELETE /api/notifications/telegram, userId={}", jwt.getSubject());
        telegram.disconnect(userId(jwt));
        log.info("Endpoint response: DELETE /api/notifications/telegram, userId={}", jwt.getSubject());
        return telegram.connection(userId(jwt));
    }

    private static UUID userId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
