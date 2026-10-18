package com.hackathon.app.e2e;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * Почти E2E: весь контекст приложения, настоящая цепочка Spring Security, JWT, cookie и JPA (H2 в памяти).
 * Не мокаем ничего из своего кода. Два теста: «счастливый путь» и «плохие входные данные».
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class AuthFlowE2ETest {

	@Autowired
	MockMvc mvc;

	private static String registerJson(String username, String email, String password) {
		return """
				{"username":"%s","email":"%s","firstName":"Иван","lastName":"Иванов","password":"%s"}
				""".formatted(username, email, password);
	}

	private static String loginJson(String username, String password) {
		return """
				{"username":"%s","password":"%s"}
				""".formatted(username, password);
	}

	private Cookie cookieOf(MvcResult result, String name) {
		var c = result.getResponse().getCookie(name);
		if (c == null) {
			throw new AssertionError("нет cookie " + name);
		}
		return c;
	}

	/**
	 * ФЛОУ: новый пользователь регистрируется, входит, работает с защищённым API, продлевает сессию и выходит.
	 * ШАГИ:
	 *   1. Анонимный доступ: /api/ping открыт, /api/auth/me закрыт (401).
	 *   2. Имя свободно -> регистрация (201) -> имя и email (без учёта регистра) уже заняты.
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
		mvc.perform(get("/api/ping")).andExpect(status().isOk());
		mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());

		mvc.perform(get("/api/auth/users/check/username").param("username", "ivanov"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.available").value(true));

		mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
						.content(registerJson("ivanov", "Ivanov@Example.com", "SecureP@ss1")))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.username").value("ivanov"))
				.andExpect(jsonPath("$.email").value("ivanov@example.com"))
				.andExpect(jsonPath("$.systemRole").value("USER"))
				.andExpect(jsonPath("$.passwordHash").doesNotExist())
				.andExpect(jsonPath("$.password").doesNotExist());

		mvc.perform(get("/api/auth/users/check/username").param("username", "IVANOV"))
				.andExpect(jsonPath("$.available").value(false));
		mvc.perform(get("/api/auth/users/check/email").param("email", "ivanov@example.com"))
				.andExpect(jsonPath("$.available").value(false));

		mvc.perform(post("/api/auth/login").contentType(APPLICATION_JSON).content(loginJson("ivanov", "wrong-password")))
				.andExpect(status().isUnauthorized());

		var login = mvc.perform(post("/api/auth/login").contentType(APPLICATION_JSON).content(loginJson("ivanov", "SecureP@ss1")))
				.andExpect(status().isOk())
				.andExpect(cookie().httpOnly("access_token", true))
				.andExpect(cookie().httpOnly("refresh_token", true))
				.andReturn();
		var access = cookieOf(login, "access_token");
		var refresh1 = cookieOf(login, "refresh_token");

		mvc.perform(get("/api/auth/me").cookie(access))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.username").value("ivanov"))
				.andExpect(jsonPath("$.firstName").value("Иван"));

		// refresh: выдаёт новую пару, старый refresh-токен больше не годится
		var refreshed = mvc.perform(post("/api/auth/refresh").cookie(refresh1))
				.andExpect(status().isOk())
				.andReturn();
		var refresh2 = cookieOf(refreshed, "refresh_token");
		mvc.perform(get("/api/auth/me").cookie(cookieOf(refreshed, "access_token"))).andExpect(status().isOk());

		// повторное предъявление уже использованного токена = подозрение на кражу: гасятся и новые токены
		mvc.perform(post("/api/auth/refresh").cookie(refresh1)).andExpect(status().isUnauthorized());
		mvc.perform(post("/api/auth/refresh").cookie(refresh2)).andExpect(status().isUnauthorized());

		// logout гасит сессию и чистит cookie
		var relogin = mvc.perform(post("/api/auth/login").contentType(APPLICATION_JSON).content(loginJson("ivanov@example.com", "SecureP@ss1")))
				.andExpect(status().isOk()).andReturn(); // вход по email тоже работает
		var refresh3 = cookieOf(relogin, "refresh_token");
		mvc.perform(post("/api/auth/logout").cookie(refresh3))
				.andExpect(status().isNoContent())
				.andExpect(cookie().maxAge("refresh_token", 0));
		mvc.perform(post("/api/auth/refresh").cookie(refresh3)).andExpect(status().isUnauthorized());
	}

	/**
	 * ФЛОУ: некорректные данные и «грязные» cookie не ломают публичные эндпоинты и не пускают в закрытые.
	 * ШАГИ:
	 *   1. Регистрация с коротким именем, неверным email и коротким паролем -> 400.
	 *   2. Регистрация petrov; повтор с тем же именем в другом регистре -> 409; повтор с тем же email -> 409.
	 *   3. Вход и проверка email с мусорным cookie access_token -> всё равно 200 (публичные пути токен не читают).
	 *   4. /api/auth/me с мусорным токеном -> 401.
	 * ПРОВЕРЯЕМ: валидацию входа, уникальность имени и email без учёта регистра, независимость публичных путей от cookie.
	 * ПОЧЕМУ ВАЖНО: у реального пользователя в браузере часто лежит протухший access_token; если из-за него не
	 *   проходит вход или обновление сессии, человек застрянет на странице логина.
	 */
	@Test
	void badInputIsRejectedAndStaleCookieDoesNotBreakPublicEndpoints() throws Exception {
		mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
						.content(registerJson("ab", "not-an-email", "short")))
				.andExpect(status().isBadRequest());

		mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
				.content(registerJson("petrov", "petrov@example.com", "SecureP@ss1"))).andExpect(status().isCreated());
		mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
						.content(registerJson("PETROV", "other@example.com", "SecureP@ss1")))
				.andExpect(status().isConflict());
		mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
						.content(registerJson("petrov2", "PETROV@example.com", "SecureP@ss1")))
				.andExpect(status().isConflict());

		// протухший/мусорный access_token не должен ломать логин, refresh и проверки доступности
		var garbage = new Cookie("access_token", "garbage.token.value");
		mvc.perform(post("/api/auth/login").cookie(garbage).contentType(APPLICATION_JSON).content(loginJson("petrov", "SecureP@ss1")))
				.andExpect(status().isOk());
		mvc.perform(get("/api/auth/users/check/email").cookie(garbage).param("email", "free@example.com"))
				.andExpect(status().isOk()).andExpect(jsonPath("$.available").value(true));
		// а защищённый эндпоинт с мусорным токеном — 401
		mvc.perform(get("/api/auth/me").cookie(garbage)).andExpect(status().isUnauthorized());
	}
}
