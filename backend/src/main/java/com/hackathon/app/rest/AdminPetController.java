package com.hackathon.app.rest;

import java.util.List;

import com.hackathon.app.domain.dto.PetArtPreviewResponse;
import com.hackathon.app.domain.dto.PetFitRequest;
import com.hackathon.app.domain.dto.PetItemResponse;
import com.hackathon.app.domain.enums.PetBodyPart;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Свои вещи бобра в админке: PNG или SVG → SVG из контуров и посадка на часть тела.
 * Доступ только для ADMIN: правило /api/admin/** в SecurityConfig. Пользователи видят вещи в GET /api/pets/catalog.
 */
@Slf4j
@Tag(name = "admin")
@RestController
@RequestMapping(path = "/api/admin/pets/items", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AdminPetController {

	private final AdminPetService admin;

	@GetMapping
	@Operation(operationId = "admin_listPetItems", summary = "Вещи бобра, добавленные админом")
	List<PetItemResponse> list(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/admin/pets/items, userId={}", jwt.getSubject());
		var response = admin.list();
		log.info("Endpoint response: GET /api/admin/pets/items, items={}", response.size());
		return response;
	}

	@PostMapping(path = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "admin_previewPetItem", summary = "Разобрать картинку без сохранения",
			description = "PNG векторизуется, SVG очищается до контуров; считается посадка на часть тела.")
	@ApiResponse(responseCode = "200", description = "Рисунок и рассчитанная посадка")
	@ApiResponse(responseCode = "400", description = "Не PNG/SVG, пустой или слишком сложный рисунок", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "503", description = "На сервере нет Python для импорта", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetArtPreviewResponse preview(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Часть тела") @RequestParam PetBodyPart bodyPart,
			@Parameter(description = "Картинка PNG или SVG до 5 МБ") @RequestPart("file") MultipartFile file) {
		log.info("Endpoint called: POST /api/admin/pets/items/preview, userId={}, bodyPart={}, file={}",
				jwt.getSubject(), bodyPart, Uploads.describe(file));
		var response = admin.preview(bodyPart, Uploads.of(file));
		log.info("Endpoint response: POST /api/admin/pets/items/preview, paths={}, art={}", response.paths(),
				response.art().bodyPart());
		return response;
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "admin_createPetItem", summary = "Добавить вещь бобра",
			description = "x, y, scale — посадка из предпросмотра, если её подогнали руками; без них считается заново.")
	@ApiResponse(responseCode = "400", description = "Неверная картинка, название или посадка", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "503", description = "На сервере нет Python для импорта", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.CREATED)
	PetItemResponse create(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Часть тела") @RequestParam PetBodyPart bodyPart,
			@Parameter(description = "Название", example = "Золотая корона") @RequestParam String label,
			@Parameter(description = "Картинка PNG или SVG до 5 МБ") @RequestPart("file") MultipartFile file,
			@RequestParam(required = false) Double x, @RequestParam(required = false) Double y,
			@RequestParam(required = false) Double scale) {
		log.info("Endpoint called: POST /api/admin/pets/items, userId={}, bodyPart={}, label={}, file={}, fit=({}, {}, {})",
				jwt.getSubject(), bodyPart, label, Uploads.describe(file), x, y, scale);
		var fit = x == null || y == null || scale == null ? null : new PetFitRequest(x, y, scale);
		var response = admin.create(bodyPart, label, Uploads.of(file), fit);
		log.info("Endpoint response: POST /api/admin/pets/items, code={}", response.id());
		return response;
	}

	@PutMapping("/{code}/fit")
	@Operation(operationId = "admin_updatePetItemFit", summary = "Подогнать посадку вещи")
	@ApiResponse(responseCode = "200", description = "Вещь с новой посадкой")
	@ApiResponse(responseCode = "404", description = "Нет такой вещи", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PetItemResponse updateFit(@AuthenticationPrincipal Jwt jwt, @PathVariable String code,
			@Valid @RequestBody PetFitRequest request) {
		log.info("Endpoint called: PUT /api/admin/pets/items/{}/fit, userId={}, request={}", code, jwt.getSubject(), request);
		var response = admin.updateFit(code, request);
		log.info("Endpoint response: PUT /api/admin/pets/items/{}/fit, code={}", code, response.id());
		return response;
	}

	@DeleteMapping("/{code}")
	@Operation(operationId = "admin_deletePetItem", summary = "Удалить вещь", description = "Снимается со всех бобров.")
	@ApiResponse(responseCode = "404", description = "Нет такой вещи", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable String code) {
		log.info("Endpoint called: DELETE /api/admin/pets/items/{}, userId={}", code, jwt.getSubject());
		admin.delete(code);
		log.info("Endpoint response: DELETE /api/admin/pets/items/{}, status=204", code);
	}
}
