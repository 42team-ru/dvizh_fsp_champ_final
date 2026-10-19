package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.SystemRole.USER;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.Locale;
import java.util.Map;

import com.hackathon.app.domain.dto.UserResponse;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

/**
 * Почти E2E: весь контекст приложения, настоящая цепочка Spring Security, JWT, cookie и JPA (H2 в памяти).
 * Не мокаем ничего из своего кода. Два теста: «счастливый путь» и «плохие входные данные».
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class AuthFlowE2ETest {
	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;
	private TestApi api;

	@BeforeEach
	void setUp() {
		api = new TestApi(mvc, json, users, passwords);
	}

	/**
	 * ФЛОУ: новый пользователь регистрируется, входит, работает с защищённым API, продлевает сессию и выходит.
	 * ШАГИ:
	 *   1. Анонимный доступ: /api/ping открыт, /api/auth/me закрыт (401).
	 *   2. Уникальное имя свободно -> регистрация (201) -> имя и email (без учёта регистра) уже заняты.
	 *   3. Вход с неверным паролем (401), затем с верным (200) -> приходят HttpOnly cookie access_token и refresh_token.
	 *   4. /api/auth/me по cookie возвращает профиль.
	 *   5. refresh выдаёт новую пару токенов; старый refresh-токен после этого недействителен (ротация).
	 *   6. Повторное предъявление старого токена = подозрение на кражу: гасятся и свежие токены.
	 *   7. Вход по email, logout (204, cookie обнуляются), refresh после logout -> 401.
	 * ПРОВЕРЯЕМ: статусы, флаги cookie, содержимое профиля (без пароля и хеша), ротацию и отзыв refresh-токенов.
	 * ПОЧЕМУ ВАЖНО: это основной путь любого пользователя; ошибка здесь = никто не может войти, либо украденный токен
	 *   остаётся рабочим после выхода.
	 */
	@Test
	void registerLoginMeRefreshRotationLogout() throws Exception {
		// 1. Публичный API открыт, профиль требует входа; имя пока свободно.
		var guest = api.guest();
		guest.ping();
		assertThatApi(guest::me).fails(UNAUTHORIZED);
		var username = uniqueName("ivanov");
		var email = username + "@example.com";
		assertThat(guest.usernameAvailable(username)).isTrue();

		// 2. Проверяем также отсутствие секретных полей в самом JSON регистрации.
		var registered = guest.raw(post("/api/auth/register").contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(registration(username, email.toUpperCase(Locale.ROOT), "SecureP@ss1"))))
				.andExpect(status().isCreated()).andExpect(jsonPath("$.passwordHash").doesNotExist())
				.andExpect(jsonPath("$.password").doesNotExist()).andReturn();
		var profile = json.readValue(registered.getResponse().getContentAsString(), UserResponse.class);
		assertThat(profile.username()).isEqualTo(username);
		assertThat(profile.email()).isEqualTo(email);
		assertThat(profile.systemRole()).isEqualTo(USER);
		assertThat(guest.usernameAvailable(username.toUpperCase(Locale.ROOT))).isFalse();
		assertThat(guest.emailAvailable(email)).isFalse();
		assertThatApi(() -> guest.login(username, "wrong-password")).fails(UNAUTHORIZED);

		// 3. Вход выдаёт HttpOnly cookie; профиль читается по access_token.
		var login = loginCookies(username);
		var refresh1 = cookieOf(login, "refresh_token");
		var actor = api.withAccessToken(cookieOf(login, "access_token"));
		var me = actor.me();
		assertThat(me.username()).isEqualTo(username);
		assertThat(me.firstName()).isEqualTo("Иван");

		// 4. Refresh ротирует пару; повтор старого токена отзывает свежий.
		var refreshed = guest.raw(post("/api/auth/refresh").cookie(refresh1)).andExpect(status().isOk()).andReturn();
		var refresh2 = cookieOf(refreshed, "refresh_token");
		api.withAccessToken(cookieOf(refreshed, "access_token")).me();
		assertThatApi(() -> guest.refresh(refresh1)).fails(UNAUTHORIZED);
		assertThatApi(() -> guest.refresh(refresh2)).fails(UNAUTHORIZED);

		// 5. Вход по email работает; logout обнуляет cookie и отзывает refresh.
		var relogin = loginCookies(email);
		var refresh3 = cookieOf(relogin, "refresh_token");
		guest.raw(post("/api/auth/logout").cookie(refresh3))
				.andExpect(status().isNoContent()).andExpect(cookie().maxAge("refresh_token", 0));
		assertThatApi(() -> guest.refresh(refresh3)).fails(UNAUTHORIZED);
	}

	/**
	 * ФЛОУ: некорректные данные и «грязные» cookie не ломают публичные эндпоинты и не пускают в закрытые.
	 * ШАГИ:
	 *   1. Регистрация с коротким именем, неверным email и коротким паролем -> 400.
	 *   2. Регистрация уникального аккаунта; повтор с тем же именем в другом регистре -> 409; повтор с тем же email -> 409.
	 *   3. Вход и проверка email с мусорным cookie access_token -> всё равно 200 (публичные пути токен не читают).
	 *   4. /api/auth/me с мусорным токеном -> 401.
	 * ПРОВЕРЯЕМ: валидацию входа, уникальность имени и email без учёта регистра, независимость публичных путей от cookie.
	 * ПОЧЕМУ ВАЖНО: у реального пользователя в браузере часто лежит протухший access_token; если из-за него не
	 *   проходит вход или обновление сессии, человек застрянет на странице логина.
	 */
	@Test
	void badInputIsRejectedAndStaleCookieDoesNotBreakPublicEndpoints() {
		// 1. Валидация и уникальность имени/email работают без учёта регистра.
		var guest = api.guest();
		assertThatApi(() -> guest.registerAccount(registration("ab", "not-an-email", "short"))).fails(BAD_REQUEST);
		var username = uniqueName("petrov");
		var email = username + "@example.com";
		guest.registerAccount(registration(username, email, "SecureP@ss1"));
		assertThatApi(() -> guest.registerAccount(registration(username.toUpperCase(Locale.ROOT), "other@example.com", "SecureP@ss1")))
				.fails(CONFLICT);
		assertThatApi(() -> guest.registerAccount(registration(username + "2", email.toUpperCase(Locale.ROOT), "SecureP@ss1")))
				.fails(CONFLICT);

		// 2. Мусорный access_token не ломает публичные пути, но не открывает профиль.
		var stale = api.withAccessToken(new Cookie("access_token", "garbage.token.value"));
		stale.login(username, "SecureP@ss1");
		assertThat(stale.emailAvailable("free@example.com")).isTrue();
		assertThatApi(stale::me).fails(UNAUTHORIZED);
	}

	private Map<String, String> registration(String username, String email, String password) {
		return Map.of("username", username, "email", email, "firstName", "Иван", "lastName", "Иванов", "password", password);
	}

	private MvcResult loginCookies(String login) throws Exception {
		return api.guest().raw(post("/api/auth/login").contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(Map.of("username", login, "password", "SecureP@ss1"))))
				.andExpect(status().isOk()).andExpect(cookie().httpOnly("access_token", true))
				.andExpect(cookie().httpOnly("refresh_token", true)).andReturn();
	}

	private Cookie cookieOf(MvcResult result, String name) {
		var cookie = result.getResponse().getCookie(name);
		assertThat(cookie).as("cookie %s", name).isNotNull();
		return cookie;
	}
}
