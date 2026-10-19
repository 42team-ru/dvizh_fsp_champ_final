package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.EventRegistrationResponse;
import com.hackathon.app.domain.dto.MyRegistrationResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.RegistrationRequest;
import com.hackathon.app.domain.dto.RegistrationResponse;
import com.hackathon.app.domain.dto.RejectRegistrationRequest;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.TimeScope;
import com.hackathon.app.service.RegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "registrations", description = "Запись на мероприятия и решения организатора по заявкам")
@RestController
@RequestMapping(path = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class RegistrationController {

    private final RegistrationService registrations;

    @PostMapping("/events/{id}/registrations")
    @Operation(operationId = "registrations_create", summary = "Записаться на мероприятие",
            description = "FREE — сразу CONFIRMED, REQUEST — PENDING (ждёт организатора). После отмены можно записаться снова.")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Запись закрыта: снято, уже началось, уже записан, отклонён, мест нет, своё мероприятие",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ResponseStatus(HttpStatus.CREATED)
    RegistrationResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                @Valid @RequestBody(required = false) RegistrationRequest request) {
        log.info("Endpoint called: POST /api/events/{}/registrations, userId={}, request={}", id, jwt.getSubject(), request);
        var response = registrations.create(id, userId(jwt), request != null ? request.message() : null);
        log.info("Endpoint response: POST /api/events/{}/registrations, response={}", id, response);
        return response;
    }

    @DeleteMapping("/events/{id}/registrations/me")
    @Operation(operationId = "registrations_cancel", summary = "Отменить свою запись",
            description = "Место освобождается. Повторная отмена ничего не меняет (200).")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет или я не записан", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Заявка отклонена или мероприятие уже началось", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    RegistrationResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: DELETE /api/events/{}/registrations/me, userId={}", id, jwt.getSubject());
        var response = registrations.cancel(id, userId(jwt));
        log.info("Endpoint response: DELETE /api/events/{}/registrations/me, response={}", id, response);
        return response;
    }

    @GetMapping("/events/{id}/registrations")
    @Operation(operationId = "registrations_listForEvent", summary = "Участники и заявки мероприятия",
            description = "Только организатору. status — необязательный фильтр, например PENDING или REJECTED.")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<EventRegistrationResponse> listForEvent(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                                @RequestParam(required = false) RegistrationStatus status) {
        log.info("Endpoint called: GET /api/events/{}/registrations, userId={}, status={}", id, jwt.getSubject(), status);
        var response = registrations.listForEvent(id, userId(jwt), status);
        log.info("Endpoint response: GET /api/events/{}/registrations, count={}, response={}", id, response.size(), response);
        return response;
    }

    @PostMapping("/registrations/{id}/approve")
    @Operation(operationId = "registrations_approve", summary = "Принять заявку",
            description = "Только организатор. Можно принять и ранее отклонённую — так исправляется ошибка.")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "403", description = "Не организатор (админ тоже не решает)", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Заявки нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Мест нет, мероприятие снято или участник сам отменил", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    RegistrationResponse approve(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: POST /api/registrations/{}/approve, userId={}", id, jwt.getSubject());
        var response = registrations.approve(id, userId(jwt));
        log.info("Endpoint response: POST /api/registrations/{}/approve, response={}", id, response);
        return response;
    }

    @PostMapping("/registrations/{id}/reject")
    @Operation(operationId = "registrations_reject", summary = "Отклонить заявку",
            description = "Только организатор. Можно отклонить и подтверждённого. Причину участник увидит в своей записи.")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "403", description = "Не организатор (админ тоже не решает)", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Заявки нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Участник сам отменил запись", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    RegistrationResponse reject(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                @Valid @RequestBody(required = false) RejectRegistrationRequest request) {
        log.info("Endpoint called: POST /api/registrations/{}/reject, userId={}, request={}", id, jwt.getSubject(), request);
        var response = registrations.reject(id, userId(jwt), request != null ? request.reason() : null);
        log.info("Endpoint response: POST /api/registrations/{}/reject, response={}", id, response);
        return response;
    }

    @GetMapping("/registrations/mine")
    @Operation(operationId = "registrations_mine", summary = "Мои записи",
            description = "Со статусом записи и мероприятия: снятое с публикации тоже видно. Новые сверху; page с нуля, size до 100. UPCOMING — есть будущее занятие SCHEDULED, PAST — будущих занятий нет.")
    PageResponse<MyRegistrationResponse> mine(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) RegistrationStatus status, @RequestParam(required = false) TimeScope when,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        log.info("Endpoint called: GET /api/registrations/mine, userId={}", jwt.getSubject());
        var response = registrations.mine(userId(jwt), status, when, page, size);
        log.info("Endpoint response: GET /api/registrations/mine, count={}", response.totalElements());
        return response;
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
