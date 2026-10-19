package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AlbumCaptionRequest;
import com.hackathon.app.domain.dto.AlbumEventResponse;
import com.hackathon.app.domain.dto.AlbumPhotoResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.enums.AlbumSort;
import com.hackathon.app.service.AlbumService;
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

/** Альбом: фото человека с его встреч. Смотреть может любой вошедший, менять — только владелец (из JWT). */
@Slf4j
@Tag(name = "albums", description = "Альбом: фото с мероприятий")
@RestController
@RequestMapping(path = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AlbumController {

	private final AlbumService albums;

	@GetMapping("/users/{id}/album")
	@Operation(operationId = "albums_list", summary = "Альбом человека",
			description = "Фильтр по мероприятию и виду спорта; sort: NEWEST, OLDEST, EVENT_NEWEST, EVENT_OLDEST. size до 100.")
	@ApiResponse(responseCode = "200", description = "Страница фото")
	@ApiResponse(responseCode = "404", description = "Нет такого пользователя", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PageResponse<AlbumPhotoResponse> list(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
			@RequestParam(required = false) UUID eventId, @RequestParam(required = false) UUID sportId,
			@RequestParam(defaultValue = "NEWEST") AlbumSort sort,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "30") int size) {
		log.info("Endpoint called: GET /api/users/{}/album, userId={}, eventId={}, sportId={}, sort={}, page={}, size={}",
				id, jwt.getSubject(), eventId, sportId, sort, page, size);
		var response = albums.list(id, userId(jwt), eventId, sportId, sort, page, size);
		log.info("Endpoint response: GET /api/users/{}/album, total={}", id, response.totalElements());
		return response;
	}

	@GetMapping("/users/{id}/album/events")
	@Operation(operationId = "albums_events", summary = "Мероприятия в альбоме человека с числом фото")
	@ApiResponse(responseCode = "200", description = "Мероприятия, последние встречи первыми")
	@ApiResponse(responseCode = "404", description = "Нет такого пользователя", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	List<AlbumEventResponse> events(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: GET /api/users/{}/album/events, userId={}", id, jwt.getSubject());
		var response = albums.events(id);
		log.info("Endpoint response: GET /api/users/{}/album/events, count={}", id, response.size());
		return response;
	}

	@GetMapping("/users/me/album/eligible-events")
	@Operation(operationId = "albums_eligibleEvents", summary = "Куда я могу добавить фото",
			description = "Мои встречи как участника (подтверждённая запись) или организатора, последние первыми.")
	List<AlbumEventResponse> eligibleEvents(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/users/me/album/eligible-events, userId={}", jwt.getSubject());
		var response = albums.eligibleEvents(userId(jwt));
		log.info("Endpoint response: GET /api/users/me/album/eligible-events, count={}", response.size());
		return response;
	}

	@PostMapping(path = "/users/me/album", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "albums_add", summary = "Добавить фото в свой альбом (JPG, PNG, WebP до 5 МБ)")
	@ApiResponse(responseCode = "201", description = "Фото добавлено")
	@ApiResponse(responseCode = "400", description = "Не картинка, нет мероприятия или длинная подпись", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "403", description = "Встреча не ваша", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Мероприятие удалено или альбом заполнен", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.CREATED)
	AlbumPhotoResponse add(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Мероприятие, с которого фото") @RequestParam UUID eventId,
			@Parameter(description = "Подпись, до 300 символов") @RequestParam(required = false) String caption,
			@Parameter(description = "Картинка") @RequestPart("file") MultipartFile file) {
		log.info("Endpoint called: POST /api/users/me/album, userId={}, eventId={}, file={}", jwt.getSubject(), eventId,
				Uploads.describe(file));
		var response = albums.add(userId(jwt), eventId, caption, Uploads.of(file));
		log.info("Endpoint response: POST /api/users/me/album, photoId={}", response.id());
		return response;
	}

	@PutMapping(path = "/users/me/album/{photoId}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "albums_updateCaption", summary = "Подписать своё фото")
	@ApiResponse(responseCode = "200", description = "Фото с новой подписью")
	@ApiResponse(responseCode = "404", description = "Нет такого фото у вас", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	AlbumPhotoResponse updateCaption(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID photoId,
			@Valid @RequestBody AlbumCaptionRequest request) {
		log.info("Endpoint called: PUT /api/users/me/album/{}, userId={}, request={}", photoId, jwt.getSubject(), request);
		var response = albums.updateCaption(userId(jwt), photoId, request.caption());
		log.info("Endpoint response: PUT /api/users/me/album/{}, photoId={}", photoId, response.id());
		return response;
	}

	@DeleteMapping("/users/me/album/{photoId}")
	@Operation(operationId = "albums_delete", summary = "Удалить своё фото")
	@ApiResponse(responseCode = "404", description = "Нет такого фото у вас", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID photoId) {
		log.info("Endpoint called: DELETE /api/users/me/album/{}, userId={}", photoId, jwt.getSubject());
		albums.delete(userId(jwt), photoId);
		log.info("Endpoint response: DELETE /api/users/me/album/{}, status=204", photoId);
	}

	@GetMapping("/events/{id}/album")
	@Operation(operationId = "albums_forEvent", summary = "Фото участников с мероприятия")
	@ApiResponse(responseCode = "200", description = "Фото по порядку добавления")
	@ApiResponse(responseCode = "404", description = "Нет такого мероприятия", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	List<AlbumPhotoResponse> forEvent(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: GET /api/events/{}/album, userId={}", id, jwt.getSubject());
		var response = albums.forEvent(id, userId(jwt));
		log.info("Endpoint response: GET /api/events/{}/album, count={}", id, response.size());
		return response;
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
