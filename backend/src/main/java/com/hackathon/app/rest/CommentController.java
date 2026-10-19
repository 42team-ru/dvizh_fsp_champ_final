package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.CommentRequest;
import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.service.CommentService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "comments", description = "Обсуждение под мероприятием: вопросы и ответы организатора")
@RestController
@RequestMapping(path = "/api/events/{id}/comments", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class CommentController {

    private final CommentService comments;

    @GetMapping
    @Operation(operationId = "comments_list", summary = "Обсуждение мероприятия",
            description = "Старые сверху. isOrganizer — показать у автора метку «Организатор».")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<CommentResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: GET /api/events/{}/comments, userId={}", id, jwt.getSubject());
        var response = comments.list(id);
        log.info("Endpoint response: GET /api/events/{}/comments, count={}", id, response.size());
        return response;
    }

    @PostMapping
    @Operation(operationId = "comments_create", summary = "Написать в обсуждение",
            description = "Любой вошедший, даже не записанный. У удалённого мероприятия обсуждение закрыто.")
    @ApiResponse(responseCode = "400", description = "Пустой или слишком длинный текст", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Мероприятие удалено", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ResponseStatus(HttpStatus.CREATED)
    CommentResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                           @Valid @RequestBody CommentRequest request) {
        log.info("Endpoint called: POST /api/events/{}/comments, userId={}, request={}", id, jwt.getSubject(), request);
        var response = comments.create(id, userId(jwt), request.text());
        log.info("Endpoint response: POST /api/events/{}/comments, response={}", id, response);
        return response;
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
