package com.hackathon.app.rest;

import java.util.UUID;
import java.util.List;
import com.hackathon.app.domain.dto.OrganizationCardResponse;
import com.hackathon.app.domain.dto.OrganizationMeetingResponse;
import com.hackathon.app.domain.dto.OrganizationOverviewResponse;
import com.hackathon.app.domain.dto.OrganizationSubscriptionResponse;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.service.OrganizationOverviewService;
import com.hackathon.app.service.OrganizationSubscriptionService;
import org.springframework.web.bind.annotation.RequestParam;

import com.hackathon.app.domain.dto.OrganizationResponse;
import com.hackathon.app.domain.dto.PublicOrganizationResponse;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.domain.dto.FeaturedOrganizationResponse;
import com.hackathon.app.service.OrganizationAwardService;
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
	private final OrganizationAwardService awards;
    private final OrganizationOverviewService overview;
    private final OrganizationSubscriptionService subscriptions;

    @GetMapping
    @Operation(operationId = "organizations_list", summary = "Каталог одобренных организаций")
    PageResponse<OrganizationCardResponse> list(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String searchText, @RequestParam(required = false) String city,
            @RequestParam(required = false) UUID sportId, @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size) {
        log.info("Endpoint called: GET /api/organizations, userId={}, request={}/{}/{}/{}/{}/{}", jwt.getSubject(), searchText, city, sportId, mine, page, size);
        var response = overview.catalog(userId(jwt), searchText, city, sportId, mine, page, size);
        log.info("Endpoint response: GET /api/organizations, response=items:{},totalElements:{}", response.items().size(), response.totalElements());
        return response;
    }

    @GetMapping("/cities")
    @Operation(operationId = "organizations_cities", summary = "Города публичного каталога")
    List<String> cities() {
        log.info("Endpoint called: GET /api/organizations/cities");
        var response = overview.cities();
        log.info("Endpoint response: GET /api/organizations/cities, response={}", response);
        return response;
    }

    @GetMapping("/{id}/overview")
    @Operation(operationId = "organizations_overview", summary = "Сводка, расписание и первые страницы встреч и фото клуба")
    OrganizationOverviewResponse overview(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: GET /api/organizations/{}/overview, userId={}", id, jwt.getSubject());
        var response = overview.overview(id, userId(jwt));
        log.info("Endpoint response: GET /api/organizations/{}/overview, response=hostedMeetings:{},photosCount:{}", id, response.hostedMeetings(), response.photosCount());
        return response;
    }

    @GetMapping("/{id}/meetings")
    @Operation(operationId = "organizations_pastMeetings", summary = "Архив занятий организации с фильтром по спорту")
    PageResponse<OrganizationMeetingResponse> meetings(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @RequestParam(required = false) UUID sportId, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "4") int size) {
        log.info("Endpoint called: GET /api/organizations/{}/meetings, userId={}, request={}/{}/{}", id, jwt.getSubject(), sportId, page, size);
        var response = overview.past(id, userId(jwt), sportId, page, size);
        log.info("Endpoint response: GET /api/organizations/{}/meetings, response=items:{},totalElements:{}", id, response.items().size(), response.totalElements());
        return response;
    }

    @GetMapping("/{id}/photos")
    @Operation(operationId = "organizations_photos", summary = "Фото мероприятий и альбомов организации")
    PageResponse<FileResponse> photos(@PathVariable UUID id, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size) {
        log.info("Endpoint called: GET /api/organizations/{}/photos, request={}/{}", id, page, size);
        var response = overview.photos(id, page, size);
        log.info("Endpoint response: GET /api/organizations/{}/photos, response=items:{},totalElements:{}", id, response.items().size(), response.totalElements());
        return response;
    }

    @PostMapping("/{id}/subscription")
    @Operation(operationId = "organizations_subscribe", summary = "Подписаться на новые встречи организации")
    OrganizationSubscriptionResponse subscribe(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: POST /api/organizations/{}/subscription, userId={}", id, jwt.getSubject());
        var response = subscriptions.change(id, userId(jwt), true);
        log.info("Endpoint response: POST /api/organizations/{}/subscription, response=subscribed:{},subscribersCount:{}", id, response.subscribed(), response.subscribersCount());
        return response;
    }

    @DeleteMapping("/{id}/subscription")
    @Operation(operationId = "organizations_unsubscribe", summary = "Отписаться от новых встреч организации")
    OrganizationSubscriptionResponse unsubscribe(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: DELETE /api/organizations/{}/subscription, userId={}", id, jwt.getSubject());
        var response = subscriptions.change(id, userId(jwt), false);
        log.info("Endpoint response: DELETE /api/organizations/{}/subscription, response=subscribed:{},subscribersCount:{}", id, response.subscribed(), response.subscribersCount());
        return response;
    }


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

	@GetMapping("/featured")
	@Operation(operationId = "organizations_featured", summary = "Организация месяца для ленты",
			description = "Подтверждённая админом организация за прошлый или текущий месяц; пустой ответ, если её нет.")
	FeaturedOrganizationResponse featured() {
		log.info("Endpoint called: GET /api/organizations/featured");
		var response = awards.featured();
		log.info("Endpoint response: GET /api/organizations/featured, organizationId={}", response == null ? null : response.id());
		return response;
	}

	@GetMapping("/{id}")
	@Operation(operationId = "organizations_get", summary = "Публичная страница одобренной организации")
	PublicOrganizationResponse get(@PathVariable UUID id) {
        log.info("Endpoint called: GET /api/organizations/{}", id);
        var response = organizations.getPublic(id);
        log.info("Endpoint response: GET /api/organizations/{}, response=organizationId:{}", id, response.id());
        return response;
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
