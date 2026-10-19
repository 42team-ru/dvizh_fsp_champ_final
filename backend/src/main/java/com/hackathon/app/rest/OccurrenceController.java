package com.hackathon.app.rest;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.CancelOccurrenceRequest;
import com.hackathon.app.domain.dto.OccurrenceRequest;
import com.hackathon.app.domain.dto.OccurrenceResponse;
import com.hackathon.app.domain.dto.UserShortResponse;
import com.hackathon.app.service.OccurrenceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "occurrences", description = "Занятия мероприятия: даты серии, отметки «приду», отмена и перенос занятий")
@RestController
@RequestMapping(path = "/api/events/{id}/occurrences", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class OccurrenceController {

    private final OccurrenceService occurrences;

    @GetMapping
    @Operation(operationId = "occurrences_list", summary = "Занятия мероприятия",
            description = "Все занятия в [from, to] по порядку, включая отменённые. Без from — с текущего момента, "
                    + "без to — до конца серии. У разового мероприятия одно занятие. Блок viewer говорит, какие кнопки показать.")
    @ApiResponse(responseCode = "400", description = "Конец периода раньше начала", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<OccurrenceResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Parameter(description = "Начало не раньше", example = "2027-06-01T00:00:00Z")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @Parameter(description = "Начало не позже", example = "2027-06-30T23:59:59Z")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        log.info("Endpoint called: GET /api/events/{}/occurrences, userId={}, from={}, to={}", id, jwt.getSubject(), from, to);
        var response = occurrences.list(id, userId(jwt), from, to);
        log.info("Endpoint response: GET /api/events/{}/occurrences, count={}", id, response.size());
        return response;
    }

    @PostMapping
    @Operation(operationId = "occurrences_add", summary = "Добавить разовую дату в серию",
            description = "Только организатор серии. Занятие вне правил: в будущем, в границах серии, не в одно время "
                    + "с другим занятием. Правка правил его не трогает.")
    @ApiResponse(responseCode = "400", description = "Не в будущем, вне границ серии или окончание раньше начала", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Разовое мероприятие, удалено, в это время уже есть занятие или занятий слишком много", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ResponseStatus(HttpStatus.CREATED)
    OccurrenceResponse add(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody OccurrenceRequest request) {
        log.info("Endpoint called: POST /api/events/{}/occurrences, userId={}, request={}", id, jwt.getSubject(), request);
        var response = occurrences.add(id, userId(jwt), request);
        log.info("Endpoint response: POST /api/events/{}/occurrences, response={}", id, response);
        return response;
    }

    @PutMapping("/{occurrenceId}")
    @Operation(operationId = "occurrences_reschedule", summary = "Перенести занятие серии",
            description = "Только организатор. Будущее занятие, которое состоится, переносится в будущее в границах серии; "
                    + "отметки сохраняются. Без endAt длительность прежняя.")
    @ApiResponse(responseCode = "400", description = "Не в будущем, вне границ серии или окончание раньше начала", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия или занятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Занятие отменено или уже началось, в это время уже есть занятие, разовое или удалённое мероприятие", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    OccurrenceResponse reschedule(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @PathVariable UUID occurrenceId, @Valid @RequestBody OccurrenceRequest request) {
        log.info("Endpoint called: PUT /api/events/{}/occurrences/{}, userId={}, request={}", id, occurrenceId, jwt.getSubject(), request);
        var response = occurrences.reschedule(id, occurrenceId, userId(jwt), request);
        log.info("Endpoint response: PUT /api/events/{}/occurrences/{}, response={}", id, occurrenceId, response);
        return response;
    }

    @PostMapping("/{occurrenceId}/cancel")
    @Operation(operationId = "occurrences_cancel", summary = "Отменить занятие",
            description = "Только организатор. Необратимо; отметки и записи остаются, участники видят причину. "
                    + "У разового мероприятия это отмена всего мероприятия: оно уходит из ленты, запись закрывается.")
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия или занятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Уже отменено или началось, мероприятие удалено", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    OccurrenceResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @PathVariable UUID occurrenceId, @Valid @RequestBody CancelOccurrenceRequest request) {
        log.info("Endpoint called: POST /api/events/{}/occurrences/{}/cancel, userId={}, request={}", id, occurrenceId, jwt.getSubject(), request);
        var response = occurrences.cancel(id, occurrenceId, userId(jwt), request.reason());
        log.info("Endpoint response: POST /api/events/{}/occurrences/{}/cancel, response={}", id, occurrenceId, response);
        return response;
    }

    @PostMapping("/{occurrenceId}/confirm")
    @Operation(operationId = "occurrences_confirm", summary = "Подтвердить: занятие состоится",
            description = "Только организатор, если у мероприятия задан кворум. Можно и пока кворум не набран; "
                    + "подтверждение не снимается. Повторно — ничего не меняет.")
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия или занятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Кворум не задан, занятие отменено или началось, мероприятие снято или удалено", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    OccurrenceResponse confirm(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID occurrenceId) {
        log.info("Endpoint called: POST /api/events/{}/occurrences/{}/confirm, userId={}", id, occurrenceId, jwt.getSubject());
        var response = occurrences.confirm(id, occurrenceId, userId(jwt));
        log.info("Endpoint response: POST /api/events/{}/occurrences/{}/confirm, response={}", id, occurrenceId, response);
        return response;
    }

    @PostMapping("/{occurrenceId}/attendance")
    @Operation(operationId = "occurrences_attend", summary = "Отметиться «приду» на занятие серии",
            description = "Только принятому в серию, до начала занятия и пока есть места на него. Повторно — ничего не меняет.")
    @ApiResponse(responseCode = "404", description = "Мероприятия или занятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Не в серии, мест нет, занятие отменено или началось, мероприятие снято или разовое", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    OccurrenceResponse attend(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID occurrenceId) {
        log.info("Endpoint called: POST /api/events/{}/occurrences/{}/attendance, userId={}", id, occurrenceId, jwt.getSubject());
        var response = occurrences.attend(id, occurrenceId, userId(jwt));
        log.info("Endpoint response: POST /api/events/{}/occurrences/{}/attendance, response={}", id, occurrenceId, response);
        return response;
    }

    @DeleteMapping("/{occurrenceId}/attendance")
    @Operation(operationId = "occurrences_unattend", summary = "Снять отметку «приду»",
            description = "До начала занятия; место освобождается. Если отметки нет — ничего не меняет.")
    @ApiResponse(responseCode = "404", description = "Мероприятия или занятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Занятие отменено или началось, мероприятие разовое", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    OccurrenceResponse unattend(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID occurrenceId) {
        log.info("Endpoint called: DELETE /api/events/{}/occurrences/{}/attendance, userId={}", id, occurrenceId, jwt.getSubject());
        var response = occurrences.unattend(id, occurrenceId, userId(jwt));
        log.info("Endpoint response: DELETE /api/events/{}/occurrences/{}/attendance, response={}", id, occurrenceId, response);
        return response;
    }

    @GetMapping("/{occurrenceId}/attendees")
    @Operation(operationId = "occurrences_attendees", summary = "Кто придёт на занятие",
            description = "Только организатору. У серии — отметившиеся, у разового — подтверждённые участники.")
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия или занятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<UserShortResponse> attendees(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @PathVariable UUID occurrenceId) {
        log.info("Endpoint called: GET /api/events/{}/occurrences/{}/attendees, userId={}", id, occurrenceId, jwt.getSubject());
        var response = occurrences.attendees(id, occurrenceId, userId(jwt));
        log.info("Endpoint response: GET /api/events/{}/occurrences/{}/attendees, count={}", id, occurrenceId, response.size());
        return response;
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
