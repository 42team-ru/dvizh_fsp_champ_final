package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AddOrganizerRequest;
import com.hackathon.app.domain.dto.EventFilter;
import com.hackathon.app.domain.dto.EventMapFilter;
import com.hackathon.app.domain.dto.EventMapResponse;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.dto.EventResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.service.EventMapService;
import com.hackathon.app.service.EventOrganizerService;
import com.hackathon.app.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
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
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Tag(name = "events", description = "Мероприятия: лента, карточка, создание и редактирование")
@RestController
@RequestMapping(path = "/api/events", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class EventController {

    private final EventService events;
    private final EventOrganizerService organizers;
    private final EventMapService eventMap;

    @GetMapping
    @Operation(operationId = "events_list", summary = "Лента мероприятий",
            description = "Только опубликованные, ближайшие первыми, до 100 штук. Без from — начиная с текущего момента.")
    List<EventSummaryResponse> list(@AuthenticationPrincipal Jwt jwt, @ParameterObject EventFilter filter) {
        log.info("Endpoint called: GET /api/events, userId={}, request={}", jwt.getSubject(), filter);
        var response = events.list(filter, userId(jwt));
        log.info("Endpoint response: GET /api/events, count={}", response.size());
        return response;
    }

    @GetMapping("/map")
    @Operation(operationId = "events_map", summary = "Мероприятия на карте в видимой области",
            description = "GeoJSON FeatureCollection: опубликованные очные мероприятия с точкой внутри области и началом "
                    + "в [from, to]. Координаты [долгота, широта]. from по умолчанию и не раньше чем сейчас, "
                    + "to — from + 30 дней. Ближайшие первыми, не больше limit; если в области больше — truncated. "
                    + "minLon > maxLon — область через 180-й меридиан. Неверная область или период — 400.")
    EventMapResponse map(@AuthenticationPrincipal Jwt jwt, @ParameterObject @Valid EventMapFilter filter) {
        log.info("Endpoint called: GET /api/events/map, userId={}, request={}", jwt.getSubject(), filter);
        var response = eventMap.find(filter, userId(jwt));
        log.info("Endpoint response: GET /api/events/map, count={}, truncated={}", response.features().size(),
                response.truncated());
        return response;
    }

    @GetMapping("/mine")
    @Operation(operationId = "events_mine", summary = "Мои мероприятия как организатора",
            description = "Во всех статусах, включая снятые и удалённые.")
    List<EventSummaryResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: GET /api/events/mine, userId={}", jwt.getSubject());
        var response = events.mine(userId(jwt));
        log.info("Endpoint response: GET /api/events/mine, count={}", response.size());
        return response;
    }

    @GetMapping("/{id}")
    @Operation(operationId = "events_get", summary = "Карточка мероприятия",
            description = "Открывается в любом статусе: снятое и удалённое — с причиной. Блок viewer говорит, какие кнопки показать.")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    EventResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: GET /api/events/{}, userId={}", id, jwt.getSubject());
        var response = events.get(id, userId(jwt));
        log.info("Endpoint response: GET /api/events/{}, response={}", id, response);
        return response;
    }

    @PostMapping
    @Operation(operationId = "events_create", summary = "Создать мероприятие",
            description = "Публикуется сразу. Вид спорта — sportId из справочника или sportName (свой, создастся без дублей).")
    @ApiResponse(responseCode = "400", description = "Ошибка в форме", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "Администратор не создаёт мероприятия", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ResponseStatus(HttpStatus.CREATED)
    EventResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody EventRequest request) {
        log.info("Endpoint called: POST /api/events, userId={}, request={}", jwt.getSubject(), request);
        var response = events.create(userId(jwt), request);
        log.info("Endpoint response: POST /api/events, response={}", response);
        return response;
    }

    @PutMapping("/{id}")
    @Operation(operationId = "events_update", summary = "Изменить мероприятие",
            description = "Только организатор. Заменяет все поля формы; статус и модерация не меняются.")
    @ApiResponse(responseCode = "400", description = "Ошибка в форме", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Удалено или лимит мест меньше уже записанных", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    EventResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                         @Valid @RequestBody EventRequest request) {
        log.info("Endpoint called: PUT /api/events/{}, userId={}, request={}", id, jwt.getSubject(), request);
        var response = events.update(id, userId(jwt), request);
        log.info("Endpoint response: PUT /api/events/{}, response={}", id, response);
        return response;
    }

    @PostMapping("/{id}/organizers")
    @Operation(operationId = "events_addOrganizer", summary = "Добавить соорганизатора",
            description = "Только автор. Соорганизатор правит мероприятие и решает заявки наравне с автором. Возвращает новый состав.")
    @ApiResponse(responseCode = "403", description = "Не автор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия или пользователя нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Уже организатор, администратор, записан участником или мероприятие удалено",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<OrganizerResponse> addOrganizer(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                         @Valid @RequestBody AddOrganizerRequest request) {
        log.info("Endpoint called: POST /api/events/{}/organizers, userId={}, request={}", id, jwt.getSubject(), request);
        var response = organizers.add(id, userId(jwt), request.login());
        log.info("Endpoint response: POST /api/events/{}/organizers, response={}", id, response);
        return response;
    }

    @DeleteMapping("/{id}/organizers/{userId}")
    @Operation(operationId = "events_removeOrganizer", summary = "Убрать соорганизатора",
            description = "Автор убирает любого соорганизатора, соорганизатор может выйти сам. Автора убрать нельзя. Возвращает новый состав.")
    @ApiResponse(responseCode = "403", description = "Не автор и не сам соорганизатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия нет или пользователь не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Это автор или мероприятие удалено", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<OrganizerResponse> removeOrganizer(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                            @PathVariable("userId") UUID organizerId) {
        log.info("Endpoint called: DELETE /api/events/{}/organizers/{}, userId={}", id, organizerId, jwt.getSubject());
        var response = organizers.remove(id, userId(jwt), organizerId);
        log.info("Endpoint response: DELETE /api/events/{}/organizers/{}, response={}", id, organizerId, response);
        return response;
    }

    @PostMapping(path = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(operationId = "events_addPhoto", summary = "Добавить фото в галерею (JPG, PNG, WebP до 5 МБ)",
            description = "В конец галереи; первое фото — обложка в ленте. Только организатор, не больше 6 фото.")
    @ApiResponse(responseCode = "400", description = "Не тот формат или слишком большой файл", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Уже 6 фото или мероприятие удалено", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ResponseStatus(HttpStatus.CREATED)
    EventResponse addPhoto(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Parameter(description = "Изображение") @RequestPart("file") MultipartFile file) {
        log.info("Endpoint called: POST /api/events/{}/photos, userId={}, request={}", id, jwt.getSubject(), Uploads.describe(file));
        var response = events.addPhoto(id, userId(jwt), Uploads.of(file));
        log.info("Endpoint response: POST /api/events/{}/photos, photos={}", id, response.photos().size());
        return response;
    }

    @DeleteMapping("/{id}/photos/{fileId}")
    @Operation(operationId = "events_removePhoto", summary = "Удалить фото из галереи")
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    EventResponse removePhoto(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID fileId) {
        log.info("Endpoint called: DELETE /api/events/{}/photos/{}, userId={}", id, fileId, jwt.getSubject());
        var response = events.removePhoto(id, fileId, userId(jwt));
        log.info("Endpoint response: DELETE /api/events/{}/photos/{}, photos={}", id, fileId, response.photos().size());
        return response;
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
