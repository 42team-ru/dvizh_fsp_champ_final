package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.PetCatalogResponse;
import com.hackathon.app.domain.dto.PetEquipRequest;
import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.PetRenameRequest;
import com.hackathon.app.domain.dto.PetResponse;
import com.hackathon.app.service.PetCatalogService;
import com.hackathon.app.service.PetService;
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
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Бобр-маскот в профиле: свой образ меняет только владелец (из JWT), чужой можно только смотреть. */
@Slf4j
@Tag(name = "pets", description = "Бобр-маскот: каталог вещей и образ")
@RestController
@RequestMapping(path = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class PetController {

	private final PetService pets;
	private final PetCatalogService catalog;

	@GetMapping("/pets/catalog")
	@Operation(operationId = "pets_catalog", summary = "Каталог: слоты и вещи",
			description = "Все встроенные вещи доступны всем; настроение вычисляется отдельно.")
	PetCatalogResponse catalog(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/pets/catalog, userId={}", jwt.getSubject());
		var response = catalog.catalog();
		log.info("Endpoint response: GET /api/pets/catalog, slots={}", response.slots().size());
		return response;
	}

	@GetMapping("/users/me/pet")
	@Operation(operationId = "pets_getMine", summary = "Мой бобр")
	PetResponse getMine(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/users/me/pet, userId={}", jwt.getSubject());
		var response = pets.get(userId(jwt));
		log.info("Endpoint response: GET /api/users/me/pet, response={}", response);
		return response;
	}

	@PutMapping("/users/me/pet")
	@Operation(operationId = "pets_saveMine", summary = "Сохранить образ целиком",
			description = "Чего нет в outfit — снимается. Неверный образ отклоняется целиком (400), сохранённый не меняется.")
	@ApiResponse(responseCode = "400", description = "Неизвестный слот или вещь", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetResponse saveMine(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PetRequest request) {
		log.info("Endpoint called: PUT /api/users/me/pet, userId={}, request={}", jwt.getSubject(), request);
		var response = pets.save(userId(jwt), request);
		log.info("Endpoint response: PUT /api/users/me/pet, response={}", response);
		return response;
	}

	@PutMapping("/users/me/pet/name")
	@Operation(operationId = "pets_rename", summary = "Переименовать питомца")
	@ApiResponse(responseCode = "200", description = "Питомец с новым именем", content = @Content(schema = @Schema(implementation = PetResponse.class)))
	@ApiResponse(responseCode = "400", description = "Имя питомца — от 1 до 30 символов", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetResponse rename(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PetRenameRequest request) {
		log.info("Endpoint called: PUT /api/users/me/pet/name, userId={}, request={}", jwt.getSubject(), request);
		var response = pets.rename(userId(jwt), request.name());
		log.info("Endpoint response: PUT /api/users/me/pet/name, response={}", response);
		return response;
	}

	@PutMapping("/users/me/pet/slots/{slot}")
	@Operation(operationId = "pets_equip", summary = "Надеть или снять вещь в одном слоте",
			description = "Например, сменить головной убор: slot = hat, item = helmet. item = null — снять.")
	@ApiResponse(responseCode = "400", description = "Нет такой вещи в слоте", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "404", description = "Нет такого слота", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetResponse equip(@AuthenticationPrincipal Jwt jwt, @PathVariable String slot,
			@RequestBody PetEquipRequest request) {
		log.info("Endpoint called: PUT /api/users/me/pet/slots/{}, userId={}, request={}", slot, jwt.getSubject(), request);
		var response = pets.equip(userId(jwt), slot, request.item());
		log.info("Endpoint response: PUT /api/users/me/pet/slots/{}, response={}", slot, response);
		return response;
	}


	@GetMapping("/users/{id}/pet")
	@Operation(operationId = "pets_getUser", summary = "Бобр другого пользователя", description = "Только образ, без данных аккаунта.")
	@ApiResponse(responseCode = "404", description = "Нет пользователя", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetResponse getUser(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: GET /api/users/{}/pet, userId={}", id, jwt.getSubject());
		var response = pets.getPublic(id);
		log.info("Endpoint response: GET /api/users/{}/pet, response={}", id, response);
		return response;
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
