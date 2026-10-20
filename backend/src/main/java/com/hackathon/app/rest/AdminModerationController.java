package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.HideCommentRequest;
import com.hackathon.app.domain.dto.ModerationItemResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.enums.ModerationStatus;
import com.hackathon.app.domain.enums.ModerationTarget;
import com.hackathon.app.service.AdminModerationService;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Очередь постмодерации текстов (docs/moderation.md). Доступ только для ADMIN: правило /api/admin/** в SecurityConfig. */
@Slf4j
@Tag(name = "admin")
@RestController
@RequestMapping(path = "/api/admin/moderation", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AdminModerationController {

	private final AdminModerationService admin;

	@GetMapping
	@Operation(operationId = "admin_listModeration", summary = "Очередь модерации текстов",
			description = "Без status — то, что ждёт решения: сомнительное (FLAGGED) и скрытое автоматически (AUTO_HIDDEN). "
					+ "Свежие сверху, size до 100.")
	PageResponse<ModerationItemResponse> list(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(required = false) ModerationStatus status,
			@RequestParam(required = false) ModerationTarget targetType,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		log.info("Endpoint called: GET /api/admin/moderation, userId={}, status={}, targetType={}, page={}, size={}",
				jwt.getSubject(), status, targetType, page, size);
		var response = admin.list(status, targetType, page, size);
		log.info("Endpoint response: GET /api/admin/moderation, total={}", response.totalElements());
		return response;
	}

	@PostMapping("/{id}/approve")
	@Operation(operationId = "admin_approveModeration", summary = "Всё в порядке",
			description = "Снимает флаг; скрытое автоматически сообщение возвращается в обсуждение.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "404", description = "Проверки нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	ModerationItemResponse approve(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: POST /api/admin/moderation/{}/approve, userId={}", id, jwt.getSubject());
		var response = admin.approve(id, UUID.fromString(jwt.getSubject()));
		log.info("Endpoint response: POST /api/admin/moderation/{}/approve, response={}", id, response);
		return response;
	}

	@PostMapping("/{id}/hide")
	@Operation(operationId = "admin_hideModeration", summary = "Скрыть сообщение из очереди",
			description = "Только для сообщений обсуждения: как «Скрыть» на странице обсуждения, автор увидит причину.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "404", description = "Проверки нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Это не сообщение", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	ModerationItemResponse hide(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
			@Valid @RequestBody HideCommentRequest request) {
		log.info("Endpoint called: POST /api/admin/moderation/{}/hide, userId={}, request={}", id, jwt.getSubject(), request);
		var response = admin.hide(id, UUID.fromString(jwt.getSubject()), request.reason());
		log.info("Endpoint response: POST /api/admin/moderation/{}/hide, response={}", id, response);
		return response;
	}

	@PostMapping("/{id}/clear-profile")
	@Operation(operationId = "admin_clearProfileText", summary = "Очистить «О себе» в профиле",
			description = "Только для проверок профиля: текст «О себе» стирается, имя и остальное остаются.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "404", description = "Проверки нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Это не профиль", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	ModerationItemResponse clearProfile(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: POST /api/admin/moderation/{}/clear-profile, userId={}", id, jwt.getSubject());
		var response = admin.clearProfile(id, UUID.fromString(jwt.getSubject()));
		log.info("Endpoint response: POST /api/admin/moderation/{}/clear-profile, response={}", id, response);
		return response;
	}

	@PostMapping("/{id}/recheck")
	@Operation(operationId = "admin_recheckModeration", summary = "Проверить нейросетью ещё раз",
			description = "Синхронно, до нескольких секунд. Решение админа сбрасывается.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "404", description = "Проверки нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Нейросеть выключена", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	ModerationItemResponse recheck(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: POST /api/admin/moderation/{}/recheck, userId={}", id, jwt.getSubject());
		var response = admin.recheck(id);
		log.info("Endpoint response: POST /api/admin/moderation/{}/recheck, response={}", id, response);
		return response;
	}
}
