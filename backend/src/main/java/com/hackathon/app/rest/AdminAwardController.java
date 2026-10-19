package com.hackathon.app.rest;

import java.time.YearMonth;
import java.util.UUID;

import com.hackathon.app.domain.dto.AdminAwardsResponse;
import com.hackathon.app.domain.dto.OrganizationAwardResponse;
import com.hackathon.app.service.OrganizationAwardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** «Организация месяца» в админке. Доступ только для ADMIN: правило /api/admin/** в SecurityConfig. */
@Slf4j
@Tag(name = "admin")
@RestController
@RequestMapping(path = "/api/admin/awards", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AdminAwardController {

	private final OrganizationAwardService awards;

	@GetMapping
	@Operation(operationId = "admin_listAwards", summary = "Предложение «Организации месяца» и счета лучших кандидатов",
			description = "Без месяца — самое свежее предложение, ожидающее подтверждения, иначе прошлый месяц.")
	AdminAwardsResponse list(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Месяц в виде 2026-09") @RequestParam(required = false)
			@DateTimeFormat(pattern = "yyyy-MM") YearMonth month) {
		log.info("Endpoint called: GET /api/admin/awards, userId={}, month={}", jwt.getSubject(), month);
		var response = awards.forAdmin(month);
		log.info("Endpoint response: GET /api/admin/awards, period={}, candidates={}", response.period(), response.candidates().size());
		return response;
	}

	@PostMapping("/{id}/confirm")
	@Operation(operationId = "admin_confirmAward", summary = "Подтвердить «Организацию месяца»")
	OrganizationAwardResponse confirm(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: POST /api/admin/awards/{}/confirm, userId={}", id, jwt.getSubject());
		var response = awards.confirm(id, UUID.fromString(jwt.getSubject()));
		log.info("Endpoint response: POST /api/admin/awards/{}/confirm, status={}", id, response.status());
		return response;
	}
}
