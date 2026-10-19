package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.DismissRecommendationRequest;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.RecommendationExplainResponse;
import com.hackathon.app.domain.dto.RecommendationFilter;
import com.hackathon.app.domain.dto.RecommendedEventResponse;
import com.hackathon.app.domain.dto.RecommendedOrganizationResponse;
import com.hackathon.app.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Validated
@Tag(name = "recommendations", description = "Персональная подборка мероприятий и клубов")
@RestController
@RequestMapping(path = "/api/recommendations", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class RecommendationController {

	private final RecommendationService recommendations;

	@GetMapping("/events")
	@Operation(operationId = "recommendations_events", summary = "Подборка мероприятий «Вам подойдёт»",
			description = "Опубликованные мероприятия с занятием в ближайшие 30 дней, лучшие сверху. Оценка складывается "
					+ "из вида спорта (профиль, история, похожие виды), уровня, расстояния, удобного времени, знакомых "
					+ "участников и организатора, надёжности, популярности, кворума и близости начала; выдача "
					+ "разнообразится, каждая 5-я позиция — «Попробуйте новое». Без моих, записанных, скрытых и полных. "
					+ "Точка отсчёта: lat/lon → домашняя точка из предпочтений → обычные места. "
					+ "Для аккаунтов организаций и админа — пусто.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Широта без долготы или наоборот", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	PageResponse<RecommendedEventResponse> events(@AuthenticationPrincipal Jwt jwt,
			@ParameterObject @Valid RecommendationFilter filter) {
		log.info("Endpoint called: GET /api/recommendations/events, userId={}, request={}", jwt.getSubject(), filter);
		var response = recommendations.events(userId(jwt), filter);
		log.info("Endpoint response: GET /api/recommendations/events, count={}, total={}", response.items().size(),
				response.totalElements());
		return response;
	}

	@GetMapping("/events/{eventId}/explain")
	@Operation(operationId = "recommendations_explain", summary = "Почему мне это рекомендовано",
			description = "Разбор оценки мероприятия для меня: значение, вес и вклад каждого признака, множители "
					+ "и попадёт ли оно в подборку (если нет — почему).")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Широта без долготы или наоборот", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	RecommendationExplainResponse explain(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID eventId,
			@ParameterObject @Valid RecommendationFilter filter) {
		log.info("Endpoint called: GET /api/recommendations/events/{}/explain, userId={}, request={}", eventId,
				jwt.getSubject(), filter);
		var response = recommendations.explain(userId(jwt), eventId, filter);
		log.info("Endpoint response: GET /api/recommendations/events/{}/explain, response={}", eventId, response);
		return response;
	}

	@PostMapping(path = "/events/{eventId}/dismiss", consumes = MediaType.APPLICATION_JSON_VALUE)
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(operationId = "recommendations_dismiss", summary = "Не интересно",
			description = "Мероприятие больше не попадает в подборку. NOT_MY_SPORT — ещё и реже показывать этот вид спорта. "
					+ "Повтор обновляет причину.")
	@ApiResponse(responseCode = "204", description = "Скрыто")
	@ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	void dismiss(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID eventId,
			@Valid @RequestBody DismissRecommendationRequest request) {
		log.info("Endpoint called: POST /api/recommendations/events/{}/dismiss, userId={}, request={}", eventId,
				jwt.getSubject(), request);
		recommendations.dismiss(userId(jwt), eventId, request.reason());
		log.info("Endpoint response: POST /api/recommendations/events/{}/dismiss, status=204", eventId);
	}

	@DeleteMapping("/events/{eventId}/dismiss")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(operationId = "recommendations_undismiss", summary = "Вернуть скрытое в подборку",
			description = "Если не скрывали — ничего не происходит.")
	@ApiResponse(responseCode = "204", description = "Возвращено")
	@ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	void undismiss(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID eventId) {
		log.info("Endpoint called: DELETE /api/recommendations/events/{}/dismiss, userId={}", eventId, jwt.getSubject());
		recommendations.undismiss(userId(jwt), eventId);
		log.info("Endpoint response: DELETE /api/recommendations/events/{}/dismiss, status=204", eventId);
	}

	@GetMapping("/organizations")
	@Operation(operationId = "recommendations_organizations", summary = "Клубы для вас",
			description = "Одобренные организации со встречами в ближайшие 30 дней: по моим видам спорта (и похожим), "
					+ "расстоянию до их встреч (без точки — по городу), надёжности, активности, для новичка — доле "
					+ "встреч «для всех». Клубы, где я уже был 3+ раза, — ниже.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Широта без долготы или наоборот", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	List<RecommendedOrganizationResponse> organizations(@AuthenticationPrincipal Jwt jwt,
			@Parameter(description = "Текущее место: широта (вместе с lon)") @RequestParam(required = false)
			@DecimalMin("-90") @DecimalMax("90") Double lat,
			@Parameter(description = "Текущее место: долгота (вместе с lat)") @RequestParam(required = false)
			@DecimalMin("-180") @DecimalMax("180") Double lon,
			@Parameter(description = "Сколько показать, 1–20") @RequestParam(defaultValue = "6") @Min(1) @Max(20) int limit) {
		log.info("Endpoint called: GET /api/recommendations/organizations, userId={}, lat={}, lon={}, limit={}",
				jwt.getSubject(), lat, lon, limit);
		var response = recommendations.organizations(userId(jwt), lat, lon, limit);
		log.info("Endpoint response: GET /api/recommendations/organizations, count={}", response.size());
		return response;
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
