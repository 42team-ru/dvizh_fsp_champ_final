package com.hackathon.app.rest;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.CommentRequest;
import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.domain.dto.CommentUpdateRequest;
import com.hackathon.app.service.CommentService;
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
@Tag(name = "comments", description = "Обсуждение под мероприятием как чат: сообщения, ответы на сообщения, правка и удаление своего")
@RestController
@RequestMapping(path = "/api/events/{id}/comments", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class CommentController {

    private final CommentService comments;

    @GetMapping
    @Operation(operationId = "comments_list", summary = "Сообщения обсуждения",
            description = "Старые сверху. replyTo — цитата сообщения, на которое ответили; isMine — моё; canEdit — могу исправить или удалить. "
                    + "after — только сообщения новее этого момента (подгрузка новых).")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<CommentResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                               @Parameter(description = "Только сообщения новее этого момента: createdAt последнего полученного", example = "2026-10-19T09:00:00Z")
                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant after) {
        log.info("Endpoint called: GET /api/events/{}/comments, userId={}, after={}", id, jwt.getSubject(), after);
        var response = comments.list(id, userId(jwt), after);
        log.info("Endpoint response: GET /api/events/{}/comments, count={}", id, response.size());
        return response;
    }

    @PostMapping
    @Operation(operationId = "comments_create", summary = "Написать сообщение или ответить на сообщение",
            description = "Любой вошедший, даже не записанный. replyToId — ответ на сообщение. У удалённого мероприятия обсуждение закрыто.")
    @ApiResponse(responseCode = "400", description = "Пустой или слишком длинный текст, нет сообщения для ответа", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Мероприятие удалено или ответ на удалённое сообщение", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ResponseStatus(HttpStatus.CREATED)
    CommentResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                           @Valid @RequestBody CommentRequest request) {
        log.info("Endpoint called: POST /api/events/{}/comments, userId={}, request={}", id, jwt.getSubject(), request);
        var response = comments.create(id, userId(jwt), request.text(), request.replyToId());
        log.info("Endpoint response: POST /api/events/{}/comments, response={}", id, response);
        return response;
    }

    @PutMapping("/{commentId}")
    @Operation(operationId = "comments_update", summary = "Исправить своё сообщение", description = "В ответе появится editedAt.")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "403", description = "Чужое сообщение", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Нет мероприятия или сообщения", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Сообщение удалено или обсуждение закрыто", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    CommentResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID commentId,
                           @Valid @RequestBody CommentUpdateRequest request) {
        log.info("Endpoint called: PUT /api/events/{}/comments/{}, userId={}, request={}", id, commentId, jwt.getSubject(), request);
        var response = comments.update(id, commentId, userId(jwt), request.text());
        log.info("Endpoint response: PUT /api/events/{}/comments/{}, response={}", id, commentId, response);
        return response;
    }

    @DeleteMapping("/{commentId}")
    @Operation(operationId = "comments_delete", summary = "Удалить своё сообщение",
            description = "Мягко: в ленте остаётся «Сообщение удалено» (text = null, deleted = true), ответы на него сохраняются.")
    @ApiResponse(responseCode = "403", description = "Чужое сообщение", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Нет мероприятия или сообщения", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Уже удалено или обсуждение закрыто", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID commentId) {
        log.info("Endpoint called: DELETE /api/events/{}/comments/{}, userId={}", id, commentId, jwt.getSubject());
        comments.delete(id, commentId, userId(jwt));
        log.info("Endpoint response: DELETE /api/events/{}/comments/{}, status=204", id, commentId);
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
