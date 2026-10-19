package com.hackathon.app.e2e.support;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.enums.AccountType;
import com.hackathon.app.domain.enums.AuthProvider;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.ObjectMapper;

/** Общие шаги E2E: реальные регистрация, вход по cookie и создание события через API. */
public class E2eSupport {

	private static final String PASSWORD = "SecureP@ss1";

	private final MockMvc mvc;
	private final ObjectMapper json;
	private final AppUserRepository users;
	private final PasswordEncoder passwords;

	public E2eSupport(MockMvc mvc, ObjectMapper json, AppUserRepository users, PasswordEncoder passwords) {
		this.mvc = mvc;
		this.json = json;
		this.users = users;
		this.passwords = passwords;
	}

	public static String uniqueName(String prefix) {
		return prefix + UUID.randomUUID().toString().replace("-", "");
	}

	public Cookie registerAndLogin(String username, AccountType accountType) throws Exception {
		mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(Map.of(
						"username", username, "email", username + "@example.com",
						"firstName", "Иван", "lastName", "Иванов", "password", PASSWORD,
						"accountType", accountType.name()))))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.systemRole").value(accountType.name()));
		return login(username);
	}

	/** ADMIN нельзя зарегистрировать через API: сохраняем аккаунт и входим обычным способом. */
	public Cookie createAdminAndLogin() throws Exception {
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

	public Cookie login(String username) throws Exception {
		var result = mvc.perform(post("/api/auth/login").contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(Map.of("username", username, "password", PASSWORD))))
				.andExpect(status().isOk())
				.andExpect(cookie().exists("access_token"))
				.andExpect(cookie().httpOnly("access_token", true))
				.andReturn();
		return result.getResponse().getCookie("access_token");
	}

	/** Валидное событие; статус проверяет вызывающий тест, включая запрет публикации. */
	public ResultActions createEvent(Cookie access) throws Exception {
		return mvc.perform(post("/api/events").cookie(access).contentType(APPLICATION_JSON)
				.content(json.writeValueAsString(Map.of(
						"title", uniqueName("Тренировка "), "description", "Совместная тренировка клуба",
						"sportName", "Бег", "startAt", Instant.now().plus(2, ChronoUnit.DAYS).toString(),
						"format", "OFFLINE", "address", "Красноярск, спортивная площадка",
						"joinMode", "FREE"))));
	}
}
