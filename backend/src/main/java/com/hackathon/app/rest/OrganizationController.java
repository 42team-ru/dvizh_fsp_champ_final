package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.OrganizationResponse;
import com.hackathon.app.domain.dto.PublicOrganizationResponse;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.service.OrganizationService;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Tag(name = "organizations")
@RestController
@RequestMapping(path = "/api/organizations", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class OrganizationController {

	private final OrganizationService organizations;

	@GetMapping("/me")
	@Operation(operationId = "organizations_me", summary = "Анкета своей организации со статусом допуска")
	OrganizationResponse me(@AuthenticationPrincipal Jwt jwt) {
		return organizations.mine(userId(jwt));
	}

	@PutMapping("/me")
	@Operation(operationId = "organizations_saveMine",
			summary = "Сохранить анкету: первая и исправленная после отказа уходят на проверку")
	OrganizationResponse saveMine(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SaveOrganizationRequest request) {
		return organizations.saveMine(userId(jwt), request);
	}

	@PutMapping(path = "/me/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "organizations_uploadLogo", summary = "Загрузить логотип (JPG, PNG, WebP до 5 МБ)",
			description = "Заменяет прежний логотип. Статус допуска не меняется.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Не тот формат или слишком большой файл", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "404", description = "Анкета ещё не заполнена", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	OrganizationResponse uploadLogo(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Изображение") @RequestPart("file") MultipartFile file) {
		log.info("Endpoint called: PUT /api/organizations/me/logo, userId={}, request={}", jwt.getSubject(), Uploads.describe(file));
		var response = organizations.uploadLogo(userId(jwt), Uploads.of(file));
		log.info("Endpoint response: PUT /api/organizations/me/logo, logoUrl={}", response.logoUrl());
		return response;
	}

	@DeleteMapping("/me/logo")
	@Operation(operationId = "organizations_deleteLogo", summary = "Убрать логотип")
	OrganizationResponse deleteLogo(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: DELETE /api/organizations/me/logo, userId={}", jwt.getSubject());
		var response = organizations.deleteLogo(userId(jwt));
		log.info("Endpoint response: DELETE /api/organizations/me/logo, organizationId={}", response.id());
		return response;
	}

	@PostMapping(path = "/me/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "organizations_addDocument", summary = "Загрузить документ (PDF, JPG, PNG до 10 МБ)",
			description = "Устав, свидетельство и т.п. Видят организация, админ при проверке и все вошедшие после одобрения. Не больше 10.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Не тот формат или слишком большой файл", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Уже 10 документов", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	OrganizationResponse addDocument(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Документ") @RequestPart("file") MultipartFile file) {
		log.info("Endpoint called: POST /api/organizations/me/documents, userId={}, request={}", jwt.getSubject(), Uploads.describe(file));
		var response = organizations.addDocument(userId(jwt), Uploads.of(file));
		log.info("Endpoint response: POST /api/organizations/me/documents, documents={}", response.documents().size());
		return response;
	}

	@DeleteMapping("/me/documents/{fileId}")
	@Operation(operationId = "organizations_removeDocument", summary = "Удалить документ")
	OrganizationResponse removeDocument(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID fileId) {
		log.info("Endpoint called: DELETE /api/organizations/me/documents/{}, userId={}", fileId, jwt.getSubject());
		var response = organizations.removeDocument(userId(jwt), fileId);
		log.info("Endpoint response: DELETE /api/organizations/me/documents/{}, documents={}", fileId, response.documents().size());
		return response;
	}

	@GetMapping("/{id}")
	@Operation(operationId = "organizations_get", summary = "Публичная страница одобренной организации")
	PublicOrganizationResponse get(@PathVariable UUID id) {
		return organizations.getPublic(id);
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
