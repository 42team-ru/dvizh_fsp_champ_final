package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.OrganizationResponse;
import com.hackathon.app.domain.dto.PublicOrganizationResponse;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

	@GetMapping("/{id}")
	@Operation(operationId = "organizations_get", summary = "Публичная страница одобренной организации")
	PublicOrganizationResponse get(@PathVariable UUID id) {
		return organizations.getPublic(id);
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
