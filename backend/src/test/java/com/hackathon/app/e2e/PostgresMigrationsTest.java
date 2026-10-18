package com.hackathon.app.e2e;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.hackathon.app.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Единственный тест на настоящем Postgres (Testcontainers): применяются Flyway-миграции, Hibernate сверяет схему
 * с сущностями (ddl-auto=validate), а регистрация + вход проходят по реальным SQL и unique-индексам.
 * Остальные тесты идут на H2 и быстрее.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class PostgresMigrationsTest {

	@Autowired
	MockMvc mvc;

	/**
	 * ФЛОУ: приложение стартует на настоящем Postgres, регистрация и вход работают на реальных SQL.
	 * ШАГИ:
	 *   1. Старт контекста: Flyway применяет V1/V2, Hibernate (ddl-auto=validate) сверяет схему с сущностями.
	 *   2. Регистрация pg-user (201).
	 *   3. Повтор с именем PG-USER -> 409 (срабатывает уникальный индекс по lower(username), а не только проверка в коде).
	 *   4. Вход pg-user (200).
	 * ПРОВЕРЯЕМ: миграции совпадают с сущностями, уникальные индексы и типы колонок работают в Postgres.
	 * ПОЧЕМУ ВАЖНО: H2 не ловит расхождений с Postgres; без этого теста приложение может не стартовать только в проде.
	 */
	@Test
	void migrationsMatchEntitiesAndAuthWorksOnRealPostgres() throws Exception {
		mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
				.content("""
						{"username":"pg-user","email":"pg@example.com","firstName":"Пётр","lastName":"Петров","password":"SecureP@ss1"}
						""")).andExpect(status().isCreated());
		mvc.perform(post("/api/auth/register").contentType(APPLICATION_JSON)
				.content("""
						{"username":"PG-USER","email":"x@example.com","firstName":"Пётр","lastName":"Петров","password":"SecureP@ss1"}
						""")).andExpect(status().isConflict());
		mvc.perform(post("/api/auth/login").contentType(APPLICATION_JSON)
				.content("""
						{"username":"pg-user","password":"SecureP@ss1"}
						""")).andExpect(status().isOk());
	}
}
