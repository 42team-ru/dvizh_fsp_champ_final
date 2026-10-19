package com.hackathon.app.rest;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AttendanceSummaryResponse;
import com.hackathon.app.domain.dto.AttendedOccurrenceResponse;
import com.hackathon.app.domain.dto.MeResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.PublicUserResponse;
import com.hackathon.app.domain.dto.SaveUserSportsRequest;
import com.hackathon.app.domain.dto.UpdateProfileRequest;
import com.hackathon.app.domain.dto.UserSportResponse;
import com.hackathon.app.domain.dto.AchievementResponse;
import com.hackathon.app.domain.dto.WalletResponse;
import com.hackathon.app.service.AchievementService;
import com.hackathon.app.service.AttendanceHistoryService;
import com.hackathon.app.service.WalletService;
import com.hackathon.app.service.UserProfileService;
import com.hackathon.app.service.UserSportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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
	private final UserSportService userSports;
	private final AttendanceHistoryService history;
	private final WalletService wallet;
	private final AchievementService achievements;

	@GetMapping("/me/wallet")
	@Operation(operationId = "users_wallet", summary = "Мой кошелёк: монеты, уровень, энергия и последние операции")
	WalletResponse wallet(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/users/me/wallet, userId={}", jwt.getSubject());
		var response = wallet.wallet(userId(jwt));
		log.info("Endpoint response: GET /api/users/me/wallet, coins={}, level={}", response.coins(), response.level());
		return response;
	}

	@GetMapping("/me/achievements")
	@Operation(operationId = "users_achievements", summary = "Мои достижения: все шесть с прогрессом и датой получения")
	List<AchievementResponse> achievements(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/users/me/achievements, userId={}", jwt.getSubject());
		var response = achievements.list(userId(jwt));
		log.info("Endpoint response: GET /api/users/me/achievements, items={}", response.size());
		return response;
	}

	@GetMapping("/{id}")
	@Operation(operationId = "users_get", summary = "Публичный профиль организатора",
			description = "Имя, аватар, город, о себе и ближайшие опубликованные мероприятия. Без email.")
	@ApiResponse(responseCode = "404", description = "Пользователь не найден", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "200", description = "Публичный профиль", useReturnTypeSchema = true)
	PublicUserResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: GET /api/users/{}, userId={}", id, jwt.getSubject());
		var response = profiles.getPublic(id, userId(jwt));
		log.info("Endpoint response: GET /api/users/{}, events={}", id, response.events().size());
		return response;
	}

	@PutMapping(path = "/me", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "users_updateMe", summary = "Изменить свой профиль",
			description = "Имя, фамилия, город и о себе целиком. Пустые город и о себе стирают значение.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Не заполнено имя или слишком длинный текст", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	MeResponse updateMe(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateProfileRequest request) {
		log.info("Endpoint called: PUT /api/users/me, userId={}, request={}", jwt.getSubject(), request);
		var response = profiles.update(userId(jwt), request);
		log.info("Endpoint response: PUT /api/users/me, userId={}", response.id());
		return response;
	}

	@GetMapping("/me/sports")
	@Operation(operationId = "users_mySports", summary = "Мои виды спорта и уровень в каждом")
	List<UserSportResponse> mySports(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/users/me/sports, userId={}", jwt.getSubject());
		var response = userSports.of(userId(jwt));
		log.info("Endpoint response: GET /api/users/me/sports, count={}", response.size());
		return response;
	}

	@PutMapping(path = "/me/sports", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "users_saveMySports", summary = "Сохранить мои виды спорта целиком",
			description = "Вид из справочника — sportId, свой — sportName (создаётся, если его нет). "
					+ "Чего нет в списке — убирается; пустой список очищает. По ним строится лента «Для меня» (forMe).")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Не указан вид спорта или неизвестный sportId", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	List<UserSportResponse> saveMySports(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SaveUserSportsRequest request) {
		log.info("Endpoint called: PUT /api/users/me/sports, userId={}, request={}", jwt.getSubject(), request);
		var response = userSports.save(userId(jwt), request);
		log.info("Endpoint response: PUT /api/users/me/sports, count={}", response.size());
		return response;
	}

	@GetMapping("/me/history")
	@Operation(operationId = "users_history", summary = "История посещений",
			description = "Прошедшие занятия, на которые я собирался: разовое — подтверждённая запись, серия — отметка "
					+ "на занятие. Отменённые занятия и снятые мероприятия не считаются. Свежие сверху, page с нуля.")
	@ApiResponse(responseCode = "400", description = "Начало периода не раньше конца", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "200", description = "Страница истории посещений", useReturnTypeSchema = true)
	PageResponse<AttendedOccurrenceResponse> history(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Вид спорта") @RequestParam(required = false) UUID sportId,
			@Parameter(description = "Занятия не раньше", example = "2026-01-01T00:00:00Z")
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
			@Parameter(description = "Занятия раньше этого момента; по умолчанию и не позже чем сейчас", example = "2026-12-31T00:00:00Z")
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		log.info("Endpoint called: GET /api/users/me/history, userId={}, sportId={}, from={}, to={}, page={}, size={}",
				jwt.getSubject(), sportId, from, to, page, size);
		var response = history.history(userId(jwt), sportId, from, to, page, size);
		log.info("Endpoint response: GET /api/users/me/history, total={}", response.totalElements());
		return response;
	}

	@GetMapping("/me/history/summary")
	@Operation(operationId = "users_historySummary", summary = "Сводка истории посещений: всего и по видам спорта")
	AttendanceSummaryResponse historySummary(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
		log.info("Endpoint called: GET /api/users/me/history/summary, userId={}, from={}, to={}", jwt.getSubject(), from, to);
		var response = history.summary(userId(jwt), from, to);
		log.info("Endpoint response: GET /api/users/me/history/summary, total={}", response.total());
		return response;
	}

	@PutMapping(path = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "users_uploadAvatar", summary = "Загрузить аватар (JPG, PNG, WebP до 5 МБ)",
			description = "Заменяет прежний. Ссылка приходит в avatarUrl.")
	@ApiResponse(responseCode = "200", description = "OK")
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
