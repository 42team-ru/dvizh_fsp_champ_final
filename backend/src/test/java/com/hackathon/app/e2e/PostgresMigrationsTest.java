package com.hackathon.app.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.DayOfWeek;
import java.util.List;
import java.util.Map;

import com.hackathon.app.domain.dto.SaveUserPreferencesRequest;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.dto.HelpersPreferences;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.domain.enums.Daytime;
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
@SpringBootTest(properties = {"app.storage.type=memory", "app.demo.enabled=false", "app.economy.scheduler-enabled=false"})
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
	 *   4. Вход pg-user (200), сохранение и замена предпочтений через API на мигрированной схеме.
	 * ПРОВЕРЯЕМ: миграции совпадают с сущностями, уникальные индексы и типы колонок работают в Postgres;
	 * коллекция дней сохраняется и заменяется без остатков.
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
        var api = new TestApi(mvc, json, users, passwords);
        var user = api.login("pg-user");
        var initial = user.saveMyPreferences(new SaveUserPreferencesRequest(
                SportLevel.AMATEUR,
                List.of(DayOfWeek.SUNDAY, DayOfWeek.MONDAY),
                Daytime.EVENING, 5,
                new HelpersPreferences(true, true, false)));
        assertThat(user.myPreferences()).isEqualTo(initial);
        var replaced = user.saveMyPreferences(new SaveUserPreferencesRequest(
                SportLevel.PRO, List.of(DayOfWeek.FRIDAY),
                Daytime.MORNING, 20,
                new HelpersPreferences(false, false, false)));
        assertThat(user.myPreferences()).isEqualTo(replaced);
        assertThat(replaced.days()).containsExactly(DayOfWeek.FRIDAY);
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

    /**
     * ФЛОУ: человек вводит вид спорта с опечаткой и видит подсказку из справочника вместо создания дубля.
     * ШАГИ: 1. Автор создаёт событие со своим видом «Сапсёрфинг». 2. Другой человек ищет «сапсерфинк» (е вместо ё, к вместо г).
     * 3. Ищет «футбол» точно. 4. Ищет бессмыслицу.
     * ПРОВЕРЯЕМ: pg_trgm находит «Сапсёрфинг» по опечатке; точное совпадение идёт первым; случайные строки ничего не дают.
     * ПОЧЕМУ ВАЖНО: на H2 нечёткий поиск заменён заглушкой, и только здесь проверяется настоящий запрос и миграция V39 (pg_trgm).
     */
    @Test
    void sportSearchFindsTypoOnRealPostgres() {
        var api = new TestApi(mvc, json, users, passwords);
        api.newUser("pgSportAuthor").createEvent(EventForm.free().sport("Сапсёрфинг"));
        var user = api.newUser("pgSportSearch");
        assertThat(user.sports("сапсерфинк")).extracting(SportResponse::name).contains("Сапсёрфинг");
        assertThat(user.sports("футбол")).extracting(SportResponse::name).first().isEqualTo("Футбол");
        assertThat(user.sports("щщщщщщ")).isEmpty();
    }

    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired EventOccurrenceRepository occurrences;

}
