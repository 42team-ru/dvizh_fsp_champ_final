package com.hackathon.app.e2e.support;

import com.hackathon.app.domain.dto.AttendanceSummaryResponse;

import com.hackathon.app.domain.dto.AttendedOccurrenceResponse;

import com.hackathon.app.domain.dto.AdminUserResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.dto.AdminEventResponse;
import com.hackathon.app.domain.dto.PetResponse;
import com.hackathon.app.domain.dto.PetRenameRequest;
import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.PetCatalogResponse;
import com.hackathon.app.domain.dto.AdminOrganizationResponse;
import com.hackathon.app.domain.dto.AvailabilityCheckResponse;
import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.domain.dto.CancelOccurrenceRequest;
import com.hackathon.app.domain.dto.OccurrenceRequest;
import com.hackathon.app.domain.dto.OccurrenceResponse;
import com.hackathon.app.domain.dto.UserShortResponse;
import com.hackathon.app.domain.dto.EventMapResponse;
import com.hackathon.app.domain.dto.EventRegistrationResponse;
import com.hackathon.app.domain.dto.EventResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.MeResponse;
import com.hackathon.app.domain.dto.FileResponse;
import org.springframework.mock.web.MockMultipartFile;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import com.hackathon.app.domain.dto.PublicUserResponse;
import com.hackathon.app.domain.dto.SaveUserSportsRequest;
import com.hackathon.app.domain.dto.SaveUserPreferencesRequest;
import com.hackathon.app.domain.dto.UserPreferencesResponse;
import com.hackathon.app.domain.dto.UpdateProfileRequest;
import com.hackathon.app.domain.dto.UserSportResponse;
import com.hackathon.app.domain.dto.MyRegistrationResponse;
import com.hackathon.app.domain.dto.OrganizationResponse;
import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.PublicOrganizationResponse;
import com.hackathon.app.domain.dto.RegistrationResponse;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.dto.UserResponse;
import jakarta.servlet.http.Cookie;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.json.JsonMapper;

/**
 * Участник сценария: человек, организация, админ или гость. Методы названы действиями из ТЗ
 * («записаться», «одобрить», «задать вопрос») и возвращают DTO основного кода.
 * Отказ сервера бросает {@link ApiCallFailed}; проверять его через {@link ApiAssertions#assertThatApi}.
 */
public class Actor {

	private final TestApi api;
	private final String username;
	private final Cookie cookie;
	private final UUID id;

	Actor(TestApi api, String username, Cookie cookie, UUID id) {
		this.api = api;
		this.username = username;
		this.cookie = cookie;
		this.id = id;
	}

	/** Логин: по нему, например, добавляют соорганизатора. */
	public String username() {
		return username;
	}

	/** id пользователя (null у гостя). */
	public UUID id() {
		return id;
	}

	/** cookie access_token — только для проверок самой авторизации. */
	public Cookie cookie() {
		return cookie;
	}

	// ---------- профиль ----------

	public MeResponse me() {
		return send("GET /api/auth/me", get("/api/auth/me"), null, type(MeResponse.class));
	}

    /** Личный бобр с вычисляемой фразой. */
    public PetResponse pet() {
        return send("GET /api/users/me/pet", get("/api/users/me/pet"), null, type(PetResponse.class));
    }

    /** Публичный бобр без личного состояния. */
    public PetResponse petOf(UUID userId) {
        return send("GET /api/users/{id}/pet", get("/api/users/{id}/pet", userId), null, type(PetResponse.class));
    }

    /** Заменить гардероб без выбора настроения. */
    public PetResponse savePet(PetRequest request) {
        return send("PUT /api/users/me/pet", put("/api/users/me/pet"), request, type(PetResponse.class));
    }

    /** Переименовать питомца без изменения гардероба. */
    public PetResponse renamePet(String name) {
        return send("PUT /api/users/me/pet/name", put("/api/users/me/pet/name"), new PetRenameRequest(name), type(PetResponse.class));
    }

    /** Встроенный каталог. */
    public PetCatalogResponse petCatalog() {
        return send("GET /api/pets/catalog", get("/api/pets/catalog"), null, type(PetCatalogResponse.class));
    }

	/** Сохранить имя, фамилию, город и рассказ о себе целиком. */
	public MeResponse updateProfile(UpdateProfileRequest form) {
		return send("PUT /api/users/me", put("/api/users/me"), form, type(MeResponse.class));
	}

	/** Открыть публичную карточку другого пользователя. */
	public PublicUserResponse openUser(UUID userId) {
		return send("GET /api/users/" + userId, get("/api/users/{id}", userId), null, type(PublicUserResponse.class));
	}

	/** Прочитать свои виды спорта и уровни. */
	public List<UserSportResponse> mySports() {
		return send("GET /api/users/me/sports", get("/api/users/me/sports"), null, listOf(UserSportResponse.class));
	}

	/** Полностью заменить свои виды спорта; пустой список очищает интересы. */
	public List<UserSportResponse> saveMySports(SaveUserSportsRequest form) {
		return send("PUT /api/users/me/sports", put("/api/users/me/sports"), form, listOf(UserSportResponse.class));
	}

	/** Прочитать собственные предпочтения онбординга. */
	public UserPreferencesResponse myPreferences() {
		return send("GET /api/users/me/preferences", get("/api/users/me/preferences"), null, type(UserPreferencesResponse.class));
	}

	/** Полностью заменить предпочтения онбординга. */
	public UserPreferencesResponse saveMyPreferences(SaveUserPreferencesRequest form) {
		return send("PUT /api/users/me/preferences", put("/api/users/me/preferences"), form, type(UserPreferencesResponse.class));
	}

    /** Личная галерея, отдельно от аватара. */
    public List<FileResponse> myPhotos() {
        return send("GET /api/users/me/photos", get("/api/users/me/photos"), null, listOf(FileResponse.class));
    }

    public List<FileResponse> addProfilePhoto(String name, String contentType, byte[] content) {
        return send("POST /api/users/me/photos", multipart("/api/users/me/photos")
                .file(new MockMultipartFile("file", name, contentType, content)), null, listOf(FileResponse.class));
    }

    public List<FileResponse> removeProfilePhoto(UUID fileId) {
        return send("DELETE /api/users/me/photos/" + fileId,
                delete("/api/users/me/photos/{fileId}", fileId), null, listOf(FileResponse.class));
    }

    public MeResponse uploadAvatar(byte[] content) {
        return send("PUT /api/users/me/avatar", multipart(org.springframework.http.HttpMethod.PUT, "/api/users/me/avatar")
                .file(new MockMultipartFile("file", "avatar.png", "image/png", content)), null, type(MeResponse.class));
    }

    public MeResponse deleteAvatar() {
        return send("DELETE /api/users/me/avatar", delete("/api/users/me/avatar"), null, type(MeResponse.class));
    }

    /** Байты картинки; бинарный ответ не выражается JSON DTO. */
    public byte[] downloadFile(UUID fileId) {
        try {
            var response = api.raw(get("/api/files/{id}", fileId), cookie).andReturn().getResponse();
            assertThat(response.getStatus()).isEqualTo(200);
            return response.getContentAsByteArray();
        } catch (Exception e) {
            throw new AssertionError("Не удалось скачать файл", e);
        }
    }

	/** Проверить, что публичный API доступен без входа. */
	public void ping() {
		send("GET /api/ping", get("/api/ping"), null, null);
	}

	/** Проверить доступность имени без учёта регистра. */
	public boolean usernameAvailable(String username) {
		return this.<AvailabilityCheckResponse>send("GET /api/auth/users/check/username",
				get("/api/auth/users/check/username").param("username", username), null, type(AvailabilityCheckResponse.class)).available();
	}

	/** Проверить доступность email, в том числе с устаревшим cookie. */
	public boolean emailAvailable(String email) {
		return this.<AvailabilityCheckResponse>send("GET /api/auth/users/check/email",
				get("/api/auth/users/check/email").param("email", email), null, type(AvailabilityCheckResponse.class)).available();
	}

	/** Регистрация произвольной формы: в том числе ошибки полей и дубли аккаунтов. */
	public UserResponse registerAccount(Map<String, String> form) {
		return send("POST /api/auth/register", post("/api/auth/register"), form, type(UserResponse.class));
	}

	/** Попытка входа от текущего посетителя; cookie ответа не заменяют его сессию. */
	public UserResponse login(String login, String password) {
		return send("POST /api/auth/login", post("/api/auth/login"), Map.of("username", login, "password", password), type(UserResponse.class));
	}

	/** Обновить сессию предъявленным refresh_token (проверки отзыва и ротации). */
	public UserResponse refresh(Cookie refresh) {
		return send("POST /api/auth/refresh", post("/api/auth/refresh").cookie(refresh), null, type(UserResponse.class));
	}

	/** Найти вид спорта в справочнике. */
	public List<SportResponse> sports(String query) {
		return send("GET /api/sports", get("/api/sports").param("query", query), null, listOf(SportResponse.class));
	}

	UUID meId() {
		return me().id();
	}

	// ---------- мероприятия ----------

	public EventResponse createEvent(EventForm form) {
		return send("POST /api/events", post("/api/events"), form.toMap(), type(EventResponse.class));
	}

	public EventResponse updateEvent(UUID eventId, EventForm form) {
		return send("PUT /api/events/" + eventId, put("/api/events/{id}", eventId), form.toMap(), type(EventResponse.class));
	}

	/** Карточка по прямой ссылке, с блоком viewer для этого участника. */
	public EventResponse openEvent(UUID eventId) {
		return send("GET /api/events/" + eventId, get("/api/events/{id}", eventId), null, type(EventResponse.class));
	}

	/** Лента без фильтров. */
	public List<EventSummaryResponse> feed() {
		return feed(Map.of());
	}

	/** Лента с фильтрами: searchText, sportId, from, to, level, joinMode, format, organizationId. */
	public List<EventSummaryResponse> feed(Map<String, String> filters) {
		var request = get("/api/events");
		filters.forEach(request::param);
		return send("GET /api/events " + filters, request, null, listOf(EventSummaryResponse.class));
	}

	/** Поиск в ленте по тексту. */
	public List<EventSummaryResponse> search(String text) {
		return feed(Map.of("searchText", text));
	}

	/** Карта: west, south, east, north, from, to, sportId и т.д. */
	public EventMapResponse map(Map<String, String> params) {
		var request = get("/api/events/map");
		params.forEach(request::param);
		return send("GET /api/events/map " + params, request, null, type(EventMapResponse.class));
	}

	/** Мои события как организатора (автор или соорганизатор). */
	public List<EventSummaryResponse> myEvents() {
		return myEventsPage(Map.of("size", "100")).items();
	}

	public List<OrganizerResponse> addOrganizer(UUID eventId, String login) {
		return send("POST /api/events/" + eventId + "/organizers", post("/api/events/{id}/organizers", eventId),
				Map.of("login", login), listOf(OrganizerResponse.class));
	}

	public List<OrganizerResponse> removeOrganizer(UUID eventId, UUID userId) {
		return send("DELETE /api/events/" + eventId + "/organizers/" + userId,
				delete("/api/events/{id}/organizers/{userId}", eventId, userId), null, listOf(OrganizerResponse.class));
	}


	// ---------- занятия ----------

	/** Все будущие занятия, включая отменённые. */
	public List<OccurrenceResponse> occurrences(UUID eventId) {
		return occurrences(eventId, null, null);
	}

	/** Занятия в периоде; null оставляет соответствующую границу по умолчанию. */
	public List<OccurrenceResponse> occurrences(UUID eventId, Instant from, Instant to) {
		var request = get("/api/events/{id}/occurrences", eventId);
		if (from != null) {
			request.param("from", from.toString());
		}
		if (to != null) {
			request.param("to", to.toString());
		}
		return send("GET /api/events/" + eventId + "/occurrences", request, null, listOf(OccurrenceResponse.class));
	}

	/** Отметиться «приду» на занятие серии. */
	public OccurrenceResponse attend(UUID eventId, UUID occurrenceId) {
		return send("POST attendance " + occurrenceId,
				post("/api/events/{id}/occurrences/{occurrenceId}/attendance", eventId, occurrenceId),
				null, type(OccurrenceResponse.class));
	}

	/** Снять отметку и освободить место на занятии. */
	public OccurrenceResponse unattend(UUID eventId, UUID occurrenceId) {
		return send("DELETE attendance " + occurrenceId,
				delete("/api/events/{id}/occurrences/{occurrenceId}/attendance", eventId, occurrenceId),
				null, type(OccurrenceResponse.class));
	}

	/** Именной список тех, кто придёт; доступен организатору. */
	public List<UserShortResponse> attendees(UUID eventId, UUID occurrenceId) {
		return send("GET attendees " + occurrenceId,
				get("/api/events/{id}/occurrences/{occurrenceId}/attendees", eventId, occurrenceId),
				null, listOf(UserShortResponse.class));
	}

	/** Добавить в серию дату вне правил расписания. */
	public OccurrenceResponse addOccurrence(UUID eventId, Instant startAt, Instant endAt) {
		// TestApi пока считает создание занятия ответом 200; здесь проверяем контракт 201.
		var json = JsonMapper.builder().findAndAddModules().build();
		var label = "POST /api/events/" + eventId + "/occurrences";
		var response = api.raw(post("/api/events/{id}/occurrences", eventId).contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(new OccurrenceRequest(startAt, endAt))), cookie)
				.andReturn().getResponse();
		try {
			var status = HttpStatus.valueOf(response.getStatus());
			var body = response.getContentAsString();
			if (!status.is2xxSuccessful()) {
				throw new ApiCallFailed(label, status, json.readTree(body).path("detail").asText(), body);
			}
			assertThat(status).as("HTTP %s", label).isEqualTo(HttpStatus.CREATED);
			return json.readValue(body, OccurrenceResponse.class);
		} catch (java.io.UnsupportedEncodingException e) {
			throw new IllegalStateException(label + ": не удалось прочитать ответ", e);
		}
	}

	/** Перенести занятие с сохранением прежней длительности. */
	public OccurrenceResponse rescheduleOccurrence(UUID eventId, UUID occurrenceId, Instant startAt) {
		return rescheduleOccurrence(eventId, occurrenceId, startAt, null);
	}

	/** Перенести занятие, при необходимости задав новое окончание. */
	public OccurrenceResponse rescheduleOccurrence(UUID eventId, UUID occurrenceId, Instant startAt, Instant endAt) {
		return send("PUT occurrence " + occurrenceId,
				put("/api/events/{id}/occurrences/{occurrenceId}", eventId, occurrenceId),
				new OccurrenceRequest(startAt, endAt), type(OccurrenceResponse.class));
	}

	/** Отменить занятие с причиной для участников. */
	public OccurrenceResponse cancelOccurrence(UUID eventId, UUID occurrenceId, String reason) {
		return send("POST cancel occurrence " + occurrenceId,
				post("/api/events/{id}/occurrences/{occurrenceId}/cancel", eventId, occurrenceId),
				new CancelOccurrenceRequest(reason), type(OccurrenceResponse.class));
	}

	/** Подтвердить проведение занятия независимо от набранного кворума. */
	public OccurrenceResponse confirmOccurrence(UUID eventId, UUID occurrenceId) {
		return send("POST confirm occurrence " + occurrenceId,
				post("/api/events/{id}/occurrences/{occurrenceId}/confirm", eventId, occurrenceId),
				null, type(OccurrenceResponse.class));
	}

	// ---------- запись ----------

	/** Записаться: свободная запись — сразу CONFIRMED, по заявке — PENDING. */
	public RegistrationResponse joinEvent(UUID eventId) {
		return send("POST /api/events/" + eventId + "/registrations", post("/api/events/{id}/registrations", eventId),
				null, type(RegistrationResponse.class));
	}

	/** Подать заявку с сопроводительным сообщением. */
	public RegistrationResponse joinEvent(UUID eventId, String message) {
		return send("POST /api/events/" + eventId + "/registrations", post("/api/events/{id}/registrations", eventId),
				Map.of("message", message), type(RegistrationResponse.class));
	}

	public RegistrationResponse cancelRegistration(UUID eventId) {
		return send("DELETE /api/events/" + eventId + "/registrations/me",
				delete("/api/events/{id}/registrations/me", eventId), null, type(RegistrationResponse.class));
	}

	public RegistrationResponse approve(UUID registrationId) {
		return send("POST /api/registrations/" + registrationId + "/approve",
				post("/api/registrations/{id}/approve", registrationId), null, type(RegistrationResponse.class));
	}

	public RegistrationResponse reject(UUID registrationId, String reason) {
		return send("POST /api/registrations/" + registrationId + "/reject",
				post("/api/registrations/{id}/reject", registrationId), Map.of("reason", reason),
				type(RegistrationResponse.class));
	}

	/** Участники и заявки события (видит организатор). */
	public List<EventRegistrationResponse> participants(UUID eventId) {
		return send("GET /api/events/" + eventId + "/registrations", get("/api/events/{id}/registrations", eventId),
				null, listOf(EventRegistrationResponse.class));
	}

	/** Участники с фильтром по статусу: CONFIRMED, PENDING, REJECTED, CANCELLED. */
	public List<EventRegistrationResponse> participants(UUID eventId, String status) {
		return send("GET /api/events/" + eventId + "/registrations?status=" + status,
				get("/api/events/{id}/registrations", eventId).param("status", status), null,
				listOf(EventRegistrationResponse.class));
	}

	public List<MyRegistrationResponse> myRegistrations() {
		return myRegistrationsPage(Map.of("size", "100")).items();
	}

	/** Моя запись на конкретное событие; падает, если её нет. */
	public MyRegistrationResponse myRegistration(UUID eventId) {
		return myRegistrations().stream().filter(r -> r.event().id().equals(eventId)).findFirst()
				.orElseThrow(() -> new AssertionError(username + " не видит запись на событие " + eventId));
	}

	// ---------- обсуждение ----------

	public List<CommentResponse> comments(UUID eventId) {
		return send("GET /api/events/" + eventId + "/comments", get("/api/events/{id}/comments", eventId), null,
				listOf(CommentResponse.class));
	}

	/** Написать в обсуждение: вопрос участника или ответ организатора. */
	public CommentResponse comment(UUID eventId, String text) {
		return send("POST /api/events/" + eventId + "/comments", post("/api/events/{id}/comments", eventId),
				Map.of("text", text), type(CommentResponse.class));
	}

	// ---------- организация ----------

	public OrganizationResponse myOrganization() {
		return send("GET /api/organizations/me", get("/api/organizations/me"), null, type(OrganizationResponse.class));
	}

	/** Сохранить анкету: первая анкета и правка после отказа уходят на рассмотрение. */
	public OrganizationResponse submitOrganization(OrganizationForm form) {
		return send("PUT /api/organizations/me", put("/api/organizations/me"), form.toMap(),
				type(OrganizationResponse.class));
	}

	/** Публичная страница организации (только одобренной). */
	public PublicOrganizationResponse openOrganization(UUID organizationId) {
		return send("GET /api/organizations/" + organizationId, get("/api/organizations/{id}", organizationId), null,
				type(PublicOrganizationResponse.class));
	}

	// ---------- администратор ----------

	/** Заявки и организации: status (PENDING/APPROVED/REJECTED) и searchText — необязательные, null пропускается. */
	public PageResponse<AdminOrganizationResponse> adminOrganizations(String status, String q) {
		var request = get("/api/admin/organizations");
		if (status != null) {
			request.param("status", status);
		}
		if (q != null) {
			request.param("searchText", q);
		}
		return send("GET /api/admin/organizations", request, null,
				api.generic(PageResponse.class, AdminOrganizationResponse.class));
	}

	public AdminOrganizationResponse approveOrganization(UUID organizationId) {
		return send("POST /api/admin/organizations/" + organizationId + "/approve",
				post("/api/admin/organizations/{id}/approve", organizationId), null,
				type(AdminOrganizationResponse.class));
	}

	public AdminOrganizationResponse rejectOrganization(UUID organizationId, String reason) {
		return rejectOrganization(organizationId, Map.of("reason", reason));
	}

	/** Отказ с произвольным телом: проверка обязательной причины. */
	public AdminOrganizationResponse rejectOrganization(UUID organizationId, Map<String, String> body) {
		return send("POST /api/admin/organizations/" + organizationId + "/reject",
				post("/api/admin/organizations/{id}/reject", organizationId), body, type(AdminOrganizationResponse.class));
	}

	/** События в админке: searchText и status (PUBLISHED/UNPUBLISHED/DELETED) — необязательные. */
	public PageResponse<AdminEventResponse> adminEvents(String q, String status) {
		var request = get("/api/admin/events");
		if (q != null) {
			request.param("searchText", q);
		}
		if (status != null) {
			request.param("status", status);
		}
		return send("GET /api/admin/events", request, null, api.generic(PageResponse.class, AdminEventResponse.class));
	}

	public AdminEventResponse unpublishEvent(UUID eventId, String reason) {
		return unpublishEvent(eventId, Map.of("reason", reason));
	}

	/** Снять с публикации с произвольным телом; null — отсутствующее тело. */
	public AdminEventResponse unpublishEvent(UUID eventId, Map<String, String> body) {
		return send("POST /api/admin/events/" + eventId + "/unpublish", post("/api/admin/events/{id}/unpublish", eventId).contentType(APPLICATION_JSON),
				body, type(AdminEventResponse.class));
	}

	public AdminEventResponse deleteEvent(UUID eventId, String reason) {
		return deleteEvent(eventId, Map.of("reason", reason));
	}

	/** Удалить с произвольным телом; null — отсутствующее тело. */
	public AdminEventResponse deleteEvent(UUID eventId, Map<String, String> body) {
		return send("DELETE /api/admin/events/" + eventId, delete("/api/admin/events/{id}", eventId).contentType(APPLICATION_JSON), body, type(AdminEventResponse.class));
	}

    public PageResponse<EventSummaryResponse> myEventsPage(Map<String, String> params) {
        var request = get("/api/events/mine");
        params.forEach(request::param);
        return send("GET /api/events/mine", request, null, api.generic(PageResponse.class, EventSummaryResponse.class));
    }

    public PageResponse<MyRegistrationResponse> myRegistrationsPage(Map<String, String> params) {
        var request = get("/api/registrations/mine");
        params.forEach(request::param);
        return send("GET /api/registrations/mine", request, null, api.generic(PageResponse.class, MyRegistrationResponse.class));
    }

    public PageResponse<AttendedOccurrenceResponse> history(Map<String, String> params) {
        var request = get("/api/users/me/history");
        params.forEach(request::param);
        return send("GET /api/users/me/history", request, null, api.generic(PageResponse.class, AttendedOccurrenceResponse.class));
    }

    public AttendanceSummaryResponse historySummary(Map<String, String> params) {
        var request = get("/api/users/me/history/summary");
        params.forEach(request::param);
        return send("GET /api/users/me/history/summary", request, null, type(AttendanceSummaryResponse.class));
    }

    public PageResponse<AdminUserResponse> adminUsers(Map<String, String> params) {
        var request = get("/api/admin/users");
        params.forEach(request::param);
        return send("GET /api/admin/users", request, null, api.generic(PageResponse.class, AdminUserResponse.class));
    }

	// ---------- запасной выход ----------

	/**
	 * Сырой запрос от имени участника для проверок, которые не укладываются в DTO:
	 * тело с заведомо неверным JSON, флаги cookie, точный формат GeoJSON. В обычных сценариях не нужен.
	 */
	public ResultActions raw(AbstractMockHttpServletRequestBuilder<?> request) {
		return api.raw(request, cookie);
	}

	/** Произвольный запрос с телом и типом ответа — для эндпоинтов, которых ещё нет среди методов. */
	public <T> T send(String label, AbstractMockHttpServletRequestBuilder<?> request, Object body, JavaType responseType) {
		return api.send(label, request, cookie, body, responseType);
	}

	public JavaType type(Class<?> type) {
		return api.type(type);
	}

	public JavaType listOf(Class<?> element) {
		return api.listOf(element);
	}

	@Override
	public String toString() {
		return username;
	}
}
