package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.MeResponse;
import com.hackathon.app.service.UserProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Tag(name = "users", description = "Профиль пользователя")
@RestController
@RequestMapping(path = "/api/users", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class UserController {

	private final UserProfileService profiles;

	@PutMapping(path = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "users_uploadAvatar", summary = "Загрузить аватар (JPG, PNG, WebP до 5 МБ)",
			description = "Заменяет прежний. Ссылка приходит в avatarUrl.")
	@ApiResponse(responseCode = "400", description = "Не тот формат или слишком большой файл", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	MeResponse uploadAvatar(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Изображение") @RequestPart("file") MultipartFile file) {
		log.info("Endpoint called: PUT /api/users/me/avatar, userId={}, request={}", jwt.getSubject(), Uploads.describe(file));
		var response = profiles.uploadAvatar(userId(jwt), Uploads.of(file));
		log.info("Endpoint response: PUT /api/users/me/avatar, avatarUrl={}", response.avatarUrl());
		return response;
	}

	@DeleteMapping("/me/avatar")
	@Operation(operationId = "users_deleteAvatar", summary = "Убрать аватар")
	MeResponse deleteAvatar(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: DELETE /api/users/me/avatar, userId={}", jwt.getSubject());
		var response = profiles.deleteAvatar(userId(jwt));
		log.info("Endpoint response: DELETE /api/users/me/avatar, userId={}", response.id());
		return response;
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
