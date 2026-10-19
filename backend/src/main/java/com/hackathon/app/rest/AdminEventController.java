package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.AdminEventResponse;
import com.hackathon.app.domain.dto.AdminStatsResponse;
import com.hackathon.app.domain.dto.ModerateEventRequest;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.service.AdminEventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Модерация мероприятий и дашборд. Доступ только для ADMIN: правило /api/admin/** в SecurityConfig. */
@Slf4j
@Tag(name = "admin")
@RestController
@RequestMapping(path = "/api/admin", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AdminEventController {

    private final AdminEventService admin;

    @GetMapping("/stats")
    @Operation(operationId = "admin_stats", summary = "Счётчики для дашборда",
            description = "signupsByDay — сколько присоединилось по дням (например, 10 октября — 12), дни по Красноярску.")
    AdminStatsResponse stats(@AuthenticationPrincipal Jwt jwt,
                             @Parameter(description = "За сколько последних дней график регистраций (1–366)")
                             @RequestParam(defaultValue = "30") int days) {
        log.info("Endpoint called: GET /api/admin/stats, userId={}, days={}", jwt.getSubject(), days);
        var response = admin.stats(days);
        log.info("Endpoint response: GET /api/admin/stats, response={}", response);
        return response;
    }

    @GetMapping("/events")
    @Operation(operationId = "admin_listEvents", summary = "Мероприятия во всех статусах: фильтр по статусу и поиск по названию")
    PageResponse<AdminEventResponse> list(@AuthenticationPrincipal Jwt jwt,
                                          @RequestParam(required = false) EventStatus status,
                                          @RequestParam(required = false) String searchText,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        log.info("Endpoint called: GET /api/admin/events, userId={}, status={}, searchText={}, page={}, size={}",
                jwt.getSubject(), status, searchText, page, size);
        var response = admin.list(status, searchText, page, size);
        log.info("Endpoint response: GET /api/admin/events, total={}", response.totalElements());
        return response;
    }

    @PostMapping("/events/{id}/unpublish")
    @Operation(operationId = "admin_unpublishEvent", summary = "Снять с публикации с причиной",
            description = "Пропадает из ленты, запись закрывается; записавшиеся видят статус и причину.")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Мероприятие уже удалено", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    AdminEventResponse unpublish(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                 @Valid @RequestBody ModerateEventRequest request) {
        log.info("Endpoint called: POST /api/admin/events/{}/unpublish, userId={}, request={}", id, jwt.getSubject(), request);
        var response = admin.unpublish(id, userId(jwt), request.reason());
        log.info("Endpoint response: POST /api/admin/events/{}/unpublish, response={}", id, response);
        return response;
    }

    @DeleteMapping("/events/{id}")
    @Operation(operationId = "admin_deleteEvent", summary = "Удалить с причиной",
            description = "Мягкое удаление: по прямой ссылке открывается с плашкой «Удалено» и причиной.")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    AdminEventResponse delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                              @Valid @RequestBody ModerateEventRequest request) {
        log.info("Endpoint called: DELETE /api/admin/events/{}, userId={}, request={}", id, jwt.getSubject(), request);
        var response = admin.delete(id, userId(jwt), request.reason());
        log.info("Endpoint response: DELETE /api/admin/events/{}, response={}", id, response);
        return response;
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
