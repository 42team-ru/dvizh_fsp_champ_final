package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.domain.dto.PetItemResponse;
import com.hackathon.app.domain.dto.PetSlotRequest;
import com.hackathon.app.domain.dto.PetSlotResponse;
import com.hackathon.app.service.AdminPetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Каталог бобра в админке. Доступ только для ADMIN: правило /api/admin/** в SecurityConfig. Посмотреть — GET /api/pets/catalog. */
@Slf4j
@Tag(name = "admin")
@RestController
@RequestMapping(path = "/api/admin/pets", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AdminPetController {

	private final AdminPetService admin;

	@PostMapping("/slots")
	@Operation(operationId = "admin_createPetSlot", summary = "Добавить слот одежды (атрибут)",
			description = "Например «Перчатки». Появится в outfit под своим кодом.")
	@ApiResponse(responseCode = "409", description = "Такой код уже есть", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.CREATED)
	PetSlotResponse createSlot(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody PetSlotRequest request) {
		log.info("Endpoint called: POST /api/admin/pets/slots, userId={}, request={}", jwt.getSubject(), request);
		var response = admin.createSlot(request.code(), request.label());
		log.info("Endpoint response: POST /api/admin/pets/slots, response={}", response);
		return response;
	}

	@PostMapping(path = "/slots/{slot}/items", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "admin_createPetItem", summary = "Добавить вещь с картинкой",
			description = "Картинка (PNG, WebP или JPG до 5 МБ) сохраняется в S3.")
	@ApiResponse(responseCode = "400", description = "Неверный код, подпись или картинка", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "404", description = "Нет такого слота", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Вещь с таким кодом уже есть в слоте", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.CREATED)
	PetItemResponse createItem(@AuthenticationPrincipal Jwt jwt, @PathVariable String slot,
			@Parameter(description = "Код: латиница в нижнем регистре, цифры, дефис", example = "golden-crown") @RequestParam String code,
			@Parameter(description = "Подпись", example = "Золотая корона") @RequestParam String label,
			@Parameter(description = "Картинка вещи") @RequestPart("file") MultipartFile file) {
		log.info("Endpoint called: POST /api/admin/pets/slots/{}/items, userId={}, code={}, label={}, file={}",
				slot, jwt.getSubject(), code, label, Uploads.describe(file));
		var response = admin.createItem(slot, code, label, Uploads.of(file), userId(jwt));
		log.info("Endpoint response: POST /api/admin/pets/slots/{}/items, response={}", slot, response);
		return response;
	}

	@DeleteMapping("/slots/{slot}/items/{item}")
	@Operation(operationId = "admin_deletePetItem", summary = "Удалить добавленную вещь",
			description = "Снимается со всех бобров, картинка удаляется из S3. Встроенные — 409.")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void deleteItem(@AuthenticationPrincipal Jwt jwt, @PathVariable String slot, @PathVariable String item) {
		log.info("Endpoint called: DELETE /api/admin/pets/slots/{}/items/{}, userId={}", slot, item, jwt.getSubject());
		admin.deleteItem(slot, item);
		log.info("Endpoint response: DELETE /api/admin/pets/slots/{}/items/{}, status=204", slot, item);
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
