package com.hackathon.app.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.hackathon.app.TestcontainersConfiguration;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/**
 * Единственный тест на настоящем Postgres (Testcontainers): применяются Flyway-миграции, Hibernate сверяет схему
 * с сущностями (ddl-auto=validate), а регистрация + вход проходят по реальным SQL и unique-индексам.
 * Остальные тесты идут на H2 и быстрее.
 */
@Tag("postgres")
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
    /**
     * ФЛОУ: история посещений выполняется на Postgres с необязательным UUID-фильтром.
     * ШАГИ: 1. Создать две встречи и записать участника через API.
     * 2. Подготовить прошедшие занятия через репозиторий. 3. Запросить страницу размера 1, фильтр по спорту и сводку.
     * ПРОВЕРЯЕМ: основной и count-запросы с null sportId, UUID-фильтр и группировка работают на настоящем Postgres.
     * ПОЧЕМУ ВАЖНО: H2 не воспроизводит ошибку определения типа null-параметра в Postgres.
     */
    @Test
    void attendanceQueriesAcceptMissingAndPresentSportOnPostgres() {
        var api = new TestApi(mvc, json, users, passwords);
        var author = api.newUser("pgHistoryAuthor");
        var user = api.newUser("pgHistoryUser");
        var first = author.createEvent(EventForm.free());
        var second = author.createEvent(EventForm.free());
        for (var event : List.of(first, second)) {
            user.joinEvent(event.id());
            var occurrence = occurrences.findByEventIdOrderByStartAt(event.id()).getFirst();
            occurrence.setStartAt(Instant.now().minusSeconds(7200));
            occurrence.setEndAt(Instant.now().minusSeconds(3600));
            occurrences.saveAndFlush(occurrence);
        }
        assertThat(user.history(Map.of("size", "1")).totalElements()).isEqualTo(2);
        assertThat(user.history(Map.of("sportId", first.sport().id().toString(), "size", "1")).totalElements()).isEqualTo(2);
        assertThat(user.historySummary(Map.of()).total()).isEqualTo(2);
    }

    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired EventOccurrenceRepository occurrences;

}
