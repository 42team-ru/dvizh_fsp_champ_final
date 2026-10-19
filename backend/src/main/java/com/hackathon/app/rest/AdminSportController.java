package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AdminSportCountsResponse;
import com.hackathon.app.domain.dto.AdminSportResponse;
import com.hackathon.app.domain.dto.FocusPoint;
import com.hackathon.app.domain.dto.HideSportRequest;
import com.hackathon.app.domain.dto.MergeSportRequest;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.RenameSportRequest;
import com.hackathon.app.domain.enums.SportStatus;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.service.AdminSportService;
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

/** Справочник видов спорта: добавление с PNG, модерация своих видов, слияние дублей. Доступ только для ADMIN. */
@Slf4j
@Tag(name = "admin")
@RestController
@RequestMapping(path = "/api/admin/sports", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AdminSportController {

	private static final String NOT_FOUND = "Вида спорта нет";
	private static final String CONFLICT = "Состояние вида не позволяет действие";

	private final AdminSportService admin;

	@GetMapping
	@Operation(operationId = "admin_listSports", summary = "Виды спорта во всех статусах",
			description = "По алфавиту. status можно повторить (ACTIVE, PENDING, HIDDEN, MERGED); withoutImage — только без своей картинки.")
	PageResponse<AdminSportResponse> list(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(required = false) List<SportStatus> status,
			@Parameter(description = "Только виды без своей картинки") @RequestParam(required = false) Boolean withoutImage,
			@RequestParam(required = false) String searchText,
			@RequestParam(defaultValue = "0") int page,
			@RequestParam(defaultValue = "20") int size) {
		log.info("Endpoint called: GET /api/admin/sports, userId={}, status={}, withoutImage={}, searchText={}, page={}, size={}",
				jwt.getSubject(), status, withoutImage, searchText, page, size);
		var response = admin.list(status, withoutImage, searchText, page, size);
		log.info("Endpoint response: GET /api/admin/sports, total={}", response.totalElements());
		return response;
	}

	@GetMapping("/counts")
	@Operation(operationId = "admin_sportCounts", summary = "Счётчики вкладок видов спорта")
	AdminSportCountsResponse counts(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/admin/sports/counts, userId={}", jwt.getSubject());
		var response = admin.counts();
		log.info("Endpoint response: GET /api/admin/sports/counts, response={}", response);
		return response;
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "admin_createSport", summary = "Добавить вид спорта (PNG необязателен)",
			description = "Квадратный PNG от 256×256 до 2 МБ. published=false — черновик: вид скрыт, пока его не вернут в справочник.")
	@ApiResponse(responseCode = "400", description = "Пустое название или неподходящая картинка", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Такой вид уже есть", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.CREATED)
	AdminSportResponse create(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Название вида") @RequestParam String name,
			@Parameter(description = "PNG-картинка") @RequestPart(value = "file", required = false) MultipartFile file,
			@Parameter(description = "Точка фокуса по горизонтали, % (0–100)") @RequestParam(required = false) Double focusX,
			@Parameter(description = "Точка фокуса по вертикали, % (0–100)") @RequestParam(required = false) Double focusY,
			@Parameter(description = "Сразу показывать в справочнике") @RequestParam(defaultValue = "true") boolean published) {
		log.info("Endpoint called: POST /api/admin/sports, userId={}, name={}, file={}, published={}", jwt.getSubject(), name,
				file == null ? null : Uploads.describe(file), published);
		var response = admin.create(UUID.fromString(jwt.getSubject()), name, file == null || file.isEmpty() ? null : Uploads.of(file),
				focus(focusX, focusY), published);
		log.info("Endpoint response: POST /api/admin/sports, sportId={}", response.id());
		return response;
	}

	@PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "admin_renameSport", summary = "Переименовать вид спорта")
	@ApiResponse(responseCode = "404", description = NOT_FOUND, content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Такое название уже занято", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	AdminSportResponse rename(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody RenameSportRequest request) {
		log.info("Endpoint called: PUT /api/admin/sports/{}, userId={}, request={}", id, jwt.getSubject(), request);
		var response = admin.rename(id, request.name());
		log.info("Endpoint response: PUT /api/admin/sports/{}, name={}", id, response.name());
		return response;
	}

	@PutMapping(path = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "admin_replaceSportImage", summary = "Загрузить или заменить PNG вида спорта",
			description = "Квадратный PNG от 256×256 до 2 МБ. Прежняя загруженная картинка удаляется.")
	@ApiResponse(responseCode = "400", description = "Не PNG, не квадрат или слишком большой", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "404", description = NOT_FOUND, content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	AdminSportResponse replaceImage(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
			@Parameter(description = "PNG-картинка") @RequestPart("file") MultipartFile file,
			@Parameter(description = "Точка фокуса по горизонтали, % (0–100)") @RequestParam(required = false) Double focusX,
			@Parameter(description = "Точка фокуса по вертикали, % (0–100)") @RequestParam(required = false) Double focusY) {
		log.info("Endpoint called: PUT /api/admin/sports/{}/image, userId={}, file={}, focus={},{}", id, jwt.getSubject(),
				Uploads.describe(file), focusX, focusY);
		var response = admin.replaceImage(id, UUID.fromString(jwt.getSubject()), Uploads.of(file), focus(focusX, focusY));
		log.info("Endpoint response: PUT /api/admin/sports/{}/image, imageUrl={}", id, response.imageUrl());
		return response;
	}

	@DeleteMapping("/{id}/image")
	@Operation(operationId = "admin_removeSportImage", summary = "Убрать загруженный PNG",
			description = "Вид возвращается к встроенной иллюстрации или заглушке.")
	@ApiResponse(responseCode = "404", description = NOT_FOUND, content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	AdminSportResponse removeImage(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: DELETE /api/admin/sports/{}/image, userId={}", id, jwt.getSubject());
		var response = admin.removeImage(id);
		log.info("Endpoint response: DELETE /api/admin/sports/{}/image, hasImage={}", id, response.hasImage());
		return response;
	}

	@PostMapping("/{id}/approve")
	@Operation(operationId = "admin_approveSport", summary = "Одобрить свой вид пользователя")
	@ApiResponse(responseCode = "404", description = NOT_FOUND, content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Вид не ждёт проверки", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	AdminSportResponse approve(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: POST /api/admin/sports/{}/approve, userId={}", id, jwt.getSubject());
		var response = admin.approve(id, UUID.fromString(jwt.getSubject()));
		log.info("Endpoint response: POST /api/admin/sports/{}/approve, status={}", id, response.status());
		return response;
	}

	@PostMapping(path = "/{id}/hide", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "admin_hideSport", summary = "Отключить или отклонить вид с причиной",
			description = "Пропадает из справочника, новые мероприятия с ним не создаются; уже созданные остаются.")
	@ApiResponse(responseCode = "404", description = NOT_FOUND, content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Вид уже отключён", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	AdminSportResponse hide(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody HideSportRequest request) {
		log.info("Endpoint called: POST /api/admin/sports/{}/hide, userId={}, request={}", id, jwt.getSubject(), request);
		var response = admin.hide(id, UUID.fromString(jwt.getSubject()), request.reason());
		log.info("Endpoint response: POST /api/admin/sports/{}/hide, status={}", id, response.status());
		return response;
	}

	@PostMapping("/{id}/restore")
	@Operation(operationId = "admin_restoreSport", summary = "Вернуть отключённый вид в справочник")
	@ApiResponse(responseCode = "404", description = NOT_FOUND, content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Вид не отключён", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	AdminSportResponse restore(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: POST /api/admin/sports/{}/restore, userId={}", id, jwt.getSubject());
		var response = admin.restore(id, UUID.fromString(jwt.getSubject()));
		log.info("Endpoint response: POST /api/admin/sports/{}/restore, status={}", id, response.status());
		return response;
	}

	@PostMapping(path = "/{id}/merge", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "admin_mergeSport", summary = "Объединить дубль с другим видом",
			description = "Мероприятия, интересы людей и анкеты организаций переходят в целевой вид; этот получает статус MERGED.")
	@ApiResponse(responseCode = "400", description = "Целевой вид не найден или совпадает с исходным", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "404", description = NOT_FOUND, content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = CONFLICT, content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	AdminSportResponse merge(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody MergeSportRequest request) {
		log.info("Endpoint called: POST /api/admin/sports/{}/merge, userId={}, request={}", id, jwt.getSubject(), request);
		var response = admin.merge(id, request.targetId(), request.reason(), UUID.fromString(jwt.getSubject()));
		log.info("Endpoint response: POST /api/admin/sports/{}/merge, status={}", id, response.status());
		return response;
	}

	@DeleteMapping("/{id}")
	@Operation(operationId = "admin_deleteSport", summary = "Удалить неиспользуемый вид",
			description = "Только если на вид нет ссылок (мероприятия, интересы, анкеты, слитые виды); иначе его скрывают или объединяют.")
	@ApiResponse(responseCode = "204", description = "Удалён")
	@ApiResponse(responseCode = "404", description = NOT_FOUND, content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Вид используется", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: DELETE /api/admin/sports/{}, userId={}", id, jwt.getSubject());
		admin.delete(id);
		log.info("Endpoint response: DELETE /api/admin/sports/{}, deleted", id);
	}

	private static FocusPoint focus(Double x, Double y) {
		if (x == null && y == null) {
			return null;
		}
		if (x == null || y == null || x < 0 || x > 100 || y < 0 || y > 100) {
			throw new BadRequestException("Точка фокуса: обе координаты от 0 до 100");
		}
		return new FocusPoint(x, y);
	}
}
