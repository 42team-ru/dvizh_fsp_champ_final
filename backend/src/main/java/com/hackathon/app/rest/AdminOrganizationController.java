package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.AdminOrganizationResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.RejectOrganizationRequest;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.service.AdminOrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Доступ только для ADMIN: правило /api/admin/** в SecurityConfig. */
@Tag(name = "admin")
@RestController
@RequestMapping(path = "/api/admin/organizations", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AdminOrganizationController {

	private final AdminOrganizationService admin;

	@GetMapping
	@Operation(operationId = "admin_listOrganizations", summary = "Заявки и организации: фильтр по статусу и поиск по названию")
	PageResponse<AdminOrganizationResponse> list(@RequestParam(required = false) OrganizationStatus status,
			@RequestParam(required = false) String searchText, @RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		return admin.list(status, searchText, page, size);
	}

	@GetMapping("/{id}")
	@Operation(operationId = "admin_getOrganization", summary = "Карточка организации с аккаунтом заявителя")
	AdminOrganizationResponse get(@PathVariable UUID id) {
		return admin.get(id);
	}

	@PostMapping("/{id}/approve")
	@Operation(operationId = "admin_approveOrganization", summary = "Одобрить организацию")
	AdminOrganizationResponse approve(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		return admin.approve(id, userId(jwt));
	}

	@PostMapping("/{id}/reject")
	@Operation(operationId = "admin_rejectOrganization", summary = "Отклонить организацию с причиной")
	AdminOrganizationResponse reject(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
			@Valid @RequestBody RejectOrganizationRequest request) {
		return admin.reject(id, userId(jwt), request.reason());
	}

	@PostMapping("/{id}/return")
	@Operation(operationId = "admin_returnOrganization", summary = "Вернуть анкету на доработку с причиной",
			description = "Только заявку на проверке (иначе 409). Не отказ: организация дополняет анкету, и она снова уходит на проверку.")
	AdminOrganizationResponse returnForRevision(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
			@Valid @RequestBody RejectOrganizationRequest request) {
		return admin.returnForRevision(id, userId(jwt), request.reason());
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
