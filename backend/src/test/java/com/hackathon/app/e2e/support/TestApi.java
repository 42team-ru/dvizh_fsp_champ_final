package com.hackathon.app.e2e.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.dto.UserResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.enums.AccountType;
import com.hackathon.app.domain.enums.AuthProvider;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.mock.web.MockAsyncContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import tools.jackson.databind.JavaType;
import tools.jackson.databind.ObjectMapper;

/**
 * Тестовый API на языке сценариев. Запросы идут через настоящий MockMvc и цепочку Security,
 * но тест работает с участниками и действиями, а не с URL, cookie и jsonPath:
 * <pre>{@code
 * var author = api.newUser("author");
 * var event = author.createEvent(EventForm.byRequest());
 * var request = api.newUser("petya").joinEvent(event.id());
 * }</pre>
 * Успешный ответ (2xx) возвращается настоящим DTO из основного кода; ошибка бросает {@link ApiCallFailed}.
 */
public class TestApi {

	static final String PASSWORD = "SecureP@ss1";

	private final MockMvc mvc;
	private final ObjectMapper json;
	private final AppUserRepository users;
	private final PasswordEncoder passwords;

	public TestApi(MockMvc mvc, ObjectMapper json, AppUserRepository users, PasswordEncoder passwords) {
		this.mvc = mvc;
		this.json = json;
		this.users = users;
		this.passwords = passwords;
	}

	/** Уникальное имя: тесты делят одну базу и не мешают друг другу. */
	public static String uniqueName(String prefix) {
		return prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
	}

	/** Новый человек (роль USER), уже вошедший. */
	public Actor newUser(String prefix) {
		return register(uniqueName(prefix), AccountType.USER);
	}

	/** Новый аккаунт организации (роль ORG), уже вошедший; анкеты ещё нет. */
	public Actor newOrganization(String prefix) {
		return register(uniqueName(prefix), AccountType.ORG);
	}

	/** Администратор: через API его не создать, поэтому аккаунт пишется в базу, а вход — обычный. */
	public Actor newAdmin() {
		var admin = new AppUser();
		admin.setId(UUID.randomUUID());
		admin.setUsername(uniqueName("admin"));
		admin.setEmail(admin.getUsername() + "@example.com");
		admin.setPasswordHash(passwords.encode(PASSWORD));
		admin.setFirstName("Анна");
		admin.setLastName("Администратор");
		admin.setActive(true);
		admin.setSystemRole(SystemRole.ADMIN);
		admin.setAuthProvider(AuthProvider.LOCAL);
		admin.setCreatedAt(Instant.now());
		users.saveAndFlush(admin);
		return login(admin.getUsername());
	}

	/** Гость без входа: для проверок 401. */
	public Actor guest() {
		return new Actor(this, "guest", null, null);
	}

	/** Посетитель с заданным access_token: проверки профиля и устаревших cookie. */
	public Actor withAccessToken(Cookie cookie) {
		return new Actor(this, "session", cookie, null);
	}

	/** Вход существующего пользователя (пароль у всех тестовых аккаунтов общий). */
	public Actor login(String username) {
		var result = call(post("/api/auth/login").contentType(APPLICATION_JSON)
				.content(write(Map.of("username", username, "password", PASSWORD))));
		expectSuccess("POST /api/auth/login", result);
		var cookie = result.andReturn().getResponse().getCookie("access_token");
		assertThat(cookie).as("access_token после входа").isNotNull();
		assertThat(cookie.isHttpOnly()).as("HttpOnly access_token").isTrue();
		var me = new Actor(this, username, cookie, null);
		return new Actor(this, username, cookie, me.meId());
	}

	private Actor register(String username, AccountType type) {
		var body = Map.of("username", username, "email", username + "@example.com",
				"firstName", "Иван", "lastName", "Иванов", "password", PASSWORD, "accountType", type.name());
		var response = expectSuccess("POST /api/auth/register",
				call(post("/api/auth/register").contentType(APPLICATION_JSON).content(write(body))));
		assertThat(json.readValue(response, UserResponse.class).systemRole().name()).isEqualTo(type.name());
		return login(username);
	}

	// ---------- транспорт для Actor ----------

	/** Выполнить запрос от имени cookie (null — гость) и вернуть тело как type; void-ответ — null. */
	<T> T send(String label, AbstractMockHttpServletRequestBuilder<?> request, Cookie cookie, Object body, JavaType type) {
		if (cookie != null) {
			request.cookie(cookie);
		}
		if (body != null) {
			request.contentType(APPLICATION_JSON).content(write(body));
		}
		var result = call(request);
		var response = expectSuccess(label, result);
		if (type == null || response.isBlank()) {
			return null;
		}
		return json.readValue(response, type);
	}

	/**
	 * Начать асинхронный запрос (long polling) и не ждать ответа. Если сервер ответил сразу — ответ уже готов.
	 */
	<T> Pending<T> begin(String label, AbstractMockHttpServletRequestBuilder<?> request, Cookie cookie, JavaType type) {
		if (cookie != null) {
			request.cookie(cookie);
		}
		return new Pending<>(label, call(request).andReturn(), type);
	}

	/** Незавершённый асинхронный запрос: дождаться ответа или имитировать истечение ожидания. */
	public final class Pending<T> {

		private final String label;
		private final MvcResult started;
		private final JavaType type;

		private Pending(String label, MvcResult started, JavaType type) {
			this.label = label;
			this.started = started;
			this.type = type;
		}

		/** Дождаться результата (до 10 секунд) и разобрать ответ. */
		public T await() {
			if (!started.getRequest().isAsyncStarted()) {
				return read(expectSuccess(label, started));
			}
			started.getAsyncResult(10_000);
			return read(expectSuccess(label, call(asyncDispatch(started)).andReturn()));
		}

		/** Истекло время ожидания на стороне сервера: контейнер сообщает слушателям, затем ответ разбирается. */
		public T timeout() {
			if (started.getRequest().getAsyncContext() instanceof MockAsyncContext context) {
				for (var listener : context.getListeners()) {
					try {
						listener.onTimeout(new jakarta.servlet.AsyncEvent(context));
					} catch (java.io.IOException e) {
						throw new IllegalStateException(e);
					}
				}
			}
			return await();
		}

		private T read(String body) {
			return type == null || body.isBlank() ? null : json.readValue(body, type);
		}
	}

	/** Сырой запрос для редких проверок формата (cookie, GeoJSON): ResultActions без разбора. */
	ResultActions raw(AbstractMockHttpServletRequestBuilder<?> request, Cookie cookie) {
		if (cookie != null) {
			request.cookie(cookie);
		}
		return call(request);
	}

	JavaType type(Class<?> type) {
		return json.getTypeFactory().constructType(type);
	}

	JavaType listOf(Class<?> element) {
		return json.getTypeFactory().constructCollectionType(List.class, element);
	}

	JavaType generic(Class<?> container, Class<?> parameter) {
		return json.getTypeFactory().constructParametricType(container, parameter);
	}

	private ResultActions call(RequestBuilder request) {
		try {
			return mvc.perform(request);
		} catch (Exception e) {
			throw new IllegalStateException("Запрос не выполнился: " + e.getMessage(), e);
		}
	}

	private String expectSuccess(String label, ResultActions result) {
		return expectSuccess(label, result.andReturn());
	}

	private String expectSuccess(String label, MvcResult result) {
		try {
			var response = result.getResponse();
			var body = response.getContentAsString();
			var status = HttpStatus.valueOf(response.getStatus());
			if (status.is2xxSuccessful()) {
				assertThat(status).as("HTTP %s", label).isEqualTo(expectedStatus(result));
				return body;
			}
			throw new ApiCallFailed(label, status, detailOf(body), body);
		} catch (ApiCallFailed e) {
			throw e;
		} catch (Exception e) {
			throw new IllegalStateException(label + ": не удалось прочитать ответ", e);
		}
	}

	/** Точный успешный код — часть контракта, как и поля DTO. */
	private HttpStatus expectedStatus(MvcResult result) {
		var request = result.getRequest();
		var path = request.getRequestURI();
		if (path.matches("/api/recommendations/events/[^/]+/dismiss")) {
			return HttpStatus.NO_CONTENT;
		}
		if (request.getMethod().equals("POST")) {
			if (path.equals("/api/auth/logout")) {
				return HttpStatus.NO_CONTENT;
			}
			if (path.equals("/api/auth/register") || path.equals("/api/events")
					|| path.matches("/api/events/[^/]+/(registrations|comments|photos)")) {
				return HttpStatus.CREATED;
			}
		}
		return HttpStatus.OK;
	}

	private String detailOf(String body) {
		try {
			var detail = json.readTree(body).get("detail");
			return detail == null ? null : detail.asString();
		} catch (RuntimeException e) {
			return null;
		}
	}

	private String write(Object body) {
		return json.writeValueAsString(body);
	}
}
