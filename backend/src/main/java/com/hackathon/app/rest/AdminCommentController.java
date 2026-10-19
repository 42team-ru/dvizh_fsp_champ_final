package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.domain.dto.HideCommentRequest;
import com.hackathon.app.service.AdminCommentService;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Модерация обсуждений. Доступ только для ADMIN: правило /api/admin/** в SecurityConfig. */
@Slf4j
@Tag(name = "admin")
@RestController
@RequestMapping(path = "/api/admin/comments", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AdminCommentController {

	private final AdminCommentService admin;

	@PostMapping("/{id}/hide")
	@Operation(operationId = "admin_hideComment", summary = "Скрыть сообщение с причиной",
			description = "Мероприятие и остальное обсуждение остаются; вместо текста все видят «Сообщение скрыто модератором», "
					+ "автор — причину. Ответить на скрытое и изменить его нельзя.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "404", description = "Сообщения нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	CommentResponse hide(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody HideCommentRequest request) {
		log.info("Endpoint called: POST /api/admin/comments/{}/hide, userId={}, request={}", id, jwt.getSubject(), request);
		var response = admin.hide(id, UUID.fromString(jwt.getSubject()), request.reason());
		log.info("Endpoint response: POST /api/admin/comments/{}/hide, response={}", id, response);
		return response;
	}

	@PostMapping("/{id}/unhide")
	@Operation(operationId = "admin_unhideComment", summary = "Вернуть скрытое сообщение")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "404", description = "Сообщения нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	CommentResponse unhide(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: POST /api/admin/comments/{}/unhide, userId={}", id, jwt.getSubject());
		var response = admin.unhide(id, UUID.fromString(jwt.getSubject()));
		log.info("Endpoint response: POST /api/admin/comments/{}/unhide, response={}", id, response);
		return response;
	}
}
