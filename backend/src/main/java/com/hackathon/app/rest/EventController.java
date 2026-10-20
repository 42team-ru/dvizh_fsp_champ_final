package com.hackathon.app.rest;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AddOrganizerRequest;
import com.hackathon.app.domain.dto.AnnouncementRequest;
import com.hackathon.app.domain.dto.CreatePermissionResponse;
import com.hackathon.app.domain.dto.EventFilter;
import com.hackathon.app.domain.dto.EventMapFilter;
import com.hackathon.app.domain.dto.EventMapResponse;
import com.hackathon.app.domain.dto.EventRequest;
import com.hackathon.app.domain.dto.EventResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.OrganizerInvitationResponse;
import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.TimeScope;
import com.hackathon.app.service.EventMapService;
import com.hackathon.app.service.EventOrganizerService;
import com.hackathon.app.service.EventService;
import com.hackathon.app.service.RecommendationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.hackathon.app.domain.dto.FocusPoint;
import com.hackathon.app.domain.exception.BadRequestException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
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

@Slf4j
@Tag(name = "events", description = "Мероприятия: лента, карточка, создание и редактирование")
@RestController
@RequestMapping(path = "/api/events", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class EventController {

    private final EventService events;
    private final EventOrganizerService organizers;
    private final EventMapService eventMap;
    private final RecommendationService recommendations;

    @GetMapping
    @Operation(operationId = "events_list", summary = "Лента мероприятий",
            description = "Только опубликованные и видимые (организация одобрена), ближайшие первыми. Без from — начиная "
                    + "с текущего момента. Постранично: page и size (до 100), общее количество — totalElements. "
                    + "lat/lon/radiusKm — рядом с точкой, онлайн показывается всегда.")
    PageResponse<EventSummaryResponse> list(@AuthenticationPrincipal Jwt jwt, @ParameterObject @Valid EventFilter filter) {
        log.info("Endpoint called: GET /api/events, userId={}, request={}", jwt.getSubject(), filter);
        var response = events.list(filter, userId(jwt));
        log.info("Endpoint response: GET /api/events, count={}, total={}", response.items().size(), response.totalElements());
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
            description = "Во всех статусах, включая снятые и удалённые. Новые сверху; page с нуля, size до 100. UPCOMING — есть будущее занятие SCHEDULED, PAST — будущих занятий нет.")
    PageResponse<EventSummaryResponse> mine(@AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) EventStatus status, @RequestParam(required = false) TimeScope when,
            @RequestParam(required = false) String searchText, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        log.info("Endpoint called: GET /api/events/mine, userId={}", jwt.getSubject());
        var response = events.mine(userId(jwt), status, when, searchText, page, size);
        log.info("Endpoint response: GET /api/events/mine, count={}", response.totalElements());
        return response;
    }

    @GetMapping("/organizer-invitations")
    @Operation(operationId = "events_organizerInvitations", summary = "Мои приглашения в соорганизаторы",
            description = "Приглашения, которые ждут моего ответа: новые сверху, без удалённых мероприятий.")
    List<OrganizerInvitationResponse> organizerInvitations(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: GET /api/events/organizer-invitations, userId={}", jwt.getSubject());
        var response = organizers.myInvitations(userId(jwt));
        log.info("Endpoint response: GET /api/events/organizer-invitations, count={}", response.size());
        return response;
    }

    @GetMapping("/create-permission")
    @Operation(operationId = "events_createPermission", summary = "Могу ли я создавать мероприятия",
            description = "Админ не создаёт; организация — только после одобрения заявки. Причина — текст для пояснения у кнопки.")
    CreatePermissionResponse createPermission(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: GET /api/events/create-permission, userId={}", jwt.getSubject());
        var response = events.createPermission(userId(jwt));
        log.info("Endpoint response: GET /api/events/create-permission, response={}", response);
        return response;
    }

    @GetMapping("/{id}")
    @Operation(operationId = "events_get", summary = "Карточка мероприятия",
            description = "Открывается в любом статусе: снятое и удалённое — с причиной. Блок viewer говорит, какие кнопки показать.")
    @ApiResponse(responseCode = "200", description = "OK")
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
    @ApiResponse(responseCode = "200", description = "OK")
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

    @GetMapping("/{id}/similar")
    @Operation(operationId = "events_similar", summary = "Похожие встречи",
            description = "Когда мест нет или заявку отклонили: самые похожие опубликованные будущие встречи — по виду "
                    + "спорта (и похожим видам), уровню, месту, времени и составу участников, с поправкой на мой профиль. "
                    + "Кроме этой, моих и полных.")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<EventSummaryResponse> similar(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Parameter(description = "Сколько показать, 1–20") @RequestParam(defaultValue = "6") int limit) {
        log.info("Endpoint called: GET /api/events/{}/similar, userId={}, limit={}", id, jwt.getSubject(), limit);
        var response = recommendations.similar(id, userId(jwt), limit);
        log.info("Endpoint response: GET /api/events/{}/similar, count={}", id, response.size());
        return response;
    }

    @PutMapping("/{id}/announcement")
    @Operation(operationId = "events_announce", summary = "Опубликовать объявление участникам",
            description = "Закрепляется вверху карточки и приходит уведомлением участникам, ожидающим решения и листу ожидания. "
                    + "Новое заменяет прежнее. Только организатор.")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Удалено или организация не допущена", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    EventResponse announce(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
            @Valid @RequestBody AnnouncementRequest request) {
        log.info("Endpoint called: PUT /api/events/{}/announcement, userId={}, request={}", id, jwt.getSubject(), request);
        var response = events.announce(id, userId(jwt), request.text());
        log.info("Endpoint response: PUT /api/events/{}/announcement, announcedAt={}", id, response.announcedAt());
        return response;
    }

    @DeleteMapping("/{id}/announcement")
    @Operation(operationId = "events_clearAnnouncement", summary = "Снять объявление")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    EventResponse clearAnnouncement(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: DELETE /api/events/{}/announcement, userId={}", id, jwt.getSubject());
        var response = events.clearAnnouncement(id, userId(jwt));
        log.info("Endpoint response: DELETE /api/events/{}/announcement", id);
        return response;
    }

    /** Исключение из правила produces = JSON: файл календаря открывается ссылкой, а не через Orval-хук. */
    @GetMapping(path = "/{id}/calendar.ics", produces = "text/calendar")
    @Operation(operationId = "events_calendar", summary = "Добавить в календарь (.ics)",
            description = "Разовое — одно занятие; серия — мои отмеченные будущие занятия, а без отметок — все будущие. "
                    + "Приватные детали — только участникам и организатору.")
    @ApiResponse(responseCode = "200", description = "Файл iCalendar", content = @Content(mediaType = "text/calendar"))
    ResponseEntity<String> calendar(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: GET /api/events/{}/calendar.ics, userId={}", id, jwt.getSubject());
        var body = events.calendar(id, userId(jwt));
        log.info("Endpoint response: GET /api/events/{}/calendar.ics, bytes={}", id, body.length());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename("event-" + id + ".ics").build().toString())
                .contentType(new MediaType("text", "calendar", StandardCharsets.UTF_8))
                .body(body);
    }

    @PostMapping("/{id}/organizers")
    @Operation(operationId = "events_addOrganizer", summary = "Пригласить соорганизатора",
            description = "Только автор. Человек получает уведомление и сам принимает или отказывается; до ответа он в составе с invited = true. "
                    + "Соорганизатор правит мероприятие и решает заявки наравне с автором. Возвращает новый состав.")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "403", description = "Не автор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "404", description = "Мероприятия или пользователя нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Уже организатор или приглашён, администратор, записан участником или мероприятие удалено",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<OrganizerResponse> addOrganizer(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                         @Valid @RequestBody AddOrganizerRequest request) {
        log.info("Endpoint called: POST /api/events/{}/organizers, userId={}, request={}", id, jwt.getSubject(), request);
        var response = organizers.add(id, userId(jwt), request.login());
        log.info("Endpoint response: POST /api/events/{}/organizers, response={}", id, response);
        return response;
    }

    @PostMapping("/{id}/organizers/invitation/accept")
    @Operation(operationId = "events_acceptOrganizerInvite", summary = "Принять приглашение в соорганизаторы",
            description = "Становлюсь соорганизатором: правлю мероприятие и решаю заявки. Автору приходит уведомление. Возвращает оставшиеся приглашения.")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет или приглашение отозвано", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "409", description = "Записан участником или мероприятие удалено", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<OrganizerInvitationResponse> acceptOrganizerInvite(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: POST /api/events/{}/organizers/invitation/accept, userId={}", id, jwt.getSubject());
        var response = organizers.accept(id, userId(jwt));
        log.info("Endpoint response: POST /api/events/{}/organizers/invitation/accept, count={}", id, response.size());
        return response;
    }

    @PostMapping("/{id}/organizers/invitation/decline")
    @Operation(operationId = "events_declineOrganizerInvite", summary = "Отказаться от приглашения в соорганизаторы",
            description = "Автору приходит уведомление. Возвращает оставшиеся приглашения.")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "404", description = "Мероприятия нет или приглашение отозвано", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    List<OrganizerInvitationResponse> declineOrganizerInvite(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: POST /api/events/{}/organizers/invitation/decline, userId={}", id, jwt.getSubject());
        var response = organizers.decline(id, userId(jwt));
        log.info("Endpoint response: POST /api/events/{}/organizers/invitation/decline, count={}", id, response.size());
        return response;
    }

    @DeleteMapping("/{id}/organizers/{userId}")
    @Operation(operationId = "events_removeOrganizer", summary = "Убрать соорганизатора",
            description = "Автор убирает любого соорганизатора или отзывает приглашение, соорганизатор может выйти сам. Автора убрать нельзя. Возвращает новый состав.")
    @ApiResponse(responseCode = "200", description = "OK")
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
            @Parameter(description = "Изображение") @RequestPart("file") MultipartFile file,
            @Parameter(description = "Точка фокуса по горизонтали, % (0–100); без неё — центр") @RequestParam(required = false) Double focusX,
            @Parameter(description = "Точка фокуса по вертикали, % (0–100)") @RequestParam(required = false) Double focusY) {
        log.info("Endpoint called: POST /api/events/{}/photos, userId={}, request={}, focus={},{}", id, jwt.getSubject(),
                Uploads.describe(file), focusX, focusY);
        var response = events.addPhoto(id, userId(jwt), Uploads.of(file), focus(focusX, focusY));
        log.info("Endpoint response: POST /api/events/{}/photos, photos={}", id, response.photos().size());
        return response;
    }

    @DeleteMapping("/{id}/photos/{fileId}")
    @Operation(operationId = "events_removePhoto", summary = "Удалить фото из галереи")
    @ApiResponse(responseCode = "200", description = "OK")
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    EventResponse removePhoto(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID fileId) {
        log.info("Endpoint called: DELETE /api/events/{}/photos/{}, userId={}", id, fileId, jwt.getSubject());
        var response = events.removePhoto(id, fileId, userId(jwt));
        log.info("Endpoint response: DELETE /api/events/{}/photos/{}, photos={}", id, fileId, response.photos().size());
        return response;
    }

    @PutMapping(path = "/{id}/photos/{fileId}/focus", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(operationId = "events_setPhotoFocus", summary = "Точка фокуса фото: вокруг неё обрезаются превью")
    @ApiResponse(responseCode = "400", description = "Координаты вне 0–100", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    @ApiResponse(responseCode = "403", description = "Не организатор", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    EventResponse setPhotoFocus(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID fileId,
            @Valid @RequestBody FocusPoint request) {
        log.info("Endpoint called: PUT /api/events/{}/photos/{}/focus, userId={}, request={}", id, fileId, jwt.getSubject(), request);
        var response = events.setPhotoFocus(id, fileId, userId(jwt), request);
        log.info("Endpoint response: PUT /api/events/{}/photos/{}/focus, photos={}", id, fileId, response.photos().size());
        return response;
    }

    /** Обе координаты или ни одной, каждая 0–100; иначе 400. */
    private static FocusPoint focus(Double x, Double y) {
        if (x == null && y == null) return null;
        if (x == null || y == null || x < 0 || x > 100 || y < 0 || y > 100) {
            throw new BadRequestException("Точка фокуса — две координаты от 0 до 100");
        }
        return new FocusPoint(x, y);
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
