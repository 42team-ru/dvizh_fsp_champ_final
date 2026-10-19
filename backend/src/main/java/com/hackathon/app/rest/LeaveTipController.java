package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.LeaveReminderResponse;
import com.hackathon.app.domain.dto.LeaveTipResponse;
import com.hackathon.app.domain.dto.SetLeaveReminderRequest;
import com.hackathon.app.service.LeaveTipService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "users", description = "Профиль пользователя")
@RestController
@RequestMapping(path = "/api/users/me/leave-tip", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class LeaveTipController {

	private final LeaveTipService leaveTips;

	@GetMapping
	@Operation(operationId = "users_leaveTip", summary = "«Бублик подсказывает»: когда выходить на ближайшее занятие",
			description = "Время в пути пешком, на автобусе и на машине — маршрут 2ГИС на время выхода или оценка по расстоянию. "
					+ "Пустой ответ, если подсказки нет: не участник, помощник «Напоминания» выключен или впереди ничего.")
	LeaveTipResponse tip(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/users/me/leave-tip, userId={}", jwt.getSubject());
		var response = leaveTips.tip(userId(jwt));
		log.info("Endpoint response: GET /api/users/me/leave-tip, occurrenceId={}", response == null ? null : response.occurrenceId());
		return response;
	}

	@PutMapping(path = "/{occurrenceId}/reminder", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "users_setLeaveReminder", summary = "Напомнить, когда выходить",
			description = "Личное напоминание на занятие: придёт уведомлением «Напоминания». Повторный вызов заменяет время.")
	LeaveReminderResponse remind(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID occurrenceId,
			@Valid @RequestBody SetLeaveReminderRequest request) {
		log.info("Endpoint called: PUT /api/users/me/leave-tip/{}/reminder, userId={}, request={}", occurrenceId, jwt.getSubject(), request);
		var response = leaveTips.remind(userId(jwt), occurrenceId, request);
		log.info("Endpoint response: PUT /api/users/me/leave-tip/{}/reminder, response={}", occurrenceId, response);
		return response;
	}

	@DeleteMapping("/{occurrenceId}/reminder")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(operationId = "users_cancelLeaveReminder", summary = "Отменить напоминание «когда выходить»")
	void cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID occurrenceId) {
		log.info("Endpoint called: DELETE /api/users/me/leave-tip/{}/reminder, userId={}", occurrenceId, jwt.getSubject());
		leaveTips.cancel(userId(jwt), occurrenceId);
		log.info("Endpoint response: DELETE /api/users/me/leave-tip/{}/reminder, status=204", occurrenceId);
	}

	@PostMapping("/{occurrenceId}/dismiss")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(operationId = "users_dismissLeaveTip", summary = "«Не надо»: скрыть подсказку на это занятие")
	void dismiss(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID occurrenceId) {
		log.info("Endpoint called: POST /api/users/me/leave-tip/{}/dismiss, userId={}", occurrenceId, jwt.getSubject());
		leaveTips.dismiss(userId(jwt), occurrenceId);
		log.info("Endpoint response: POST /api/users/me/leave-tip/{}/dismiss, status=204", occurrenceId);
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
