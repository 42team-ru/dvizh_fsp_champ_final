package com.hackathon.app.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.springframework.http.HttpStatus.*;
import java.time.*;
import java.util.*;
import com.hackathon.app.domain.dto.*;
import com.hackathon.app.e2e.support.*;
import com.hackathon.app.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class AttendanceHistoryE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired EventOccurrenceRepository occurrences;
    private TestApi api;
    @BeforeEach void setUp() { api = new TestApi(mvc, json, users, passwords); }

    /** Подготовка прошедшего занятия: через API прошлое время задать нельзя. */
    private void moveToPast(UUID id, int days) {
        var o = occurrences.findById(id).orElseThrow();
        o.setStartAt(Instant.now().minus(Duration.ofDays(days)));
        o.setEndAt(o.getStartAt().plusSeconds(3600));
        occurrences.saveAndFlush(o);
    }

    /**
     * ФЛОУ: участник видит историю разовых встреч и отмеченных занятий серии.
     * ШАГИ: 1. Записаться на разовое и серию, отметиться на двух датах серии.
     * 2. Отменить одну дату, снять отдельную встречу с публикации и перенести занятия в прошлое.
     * 3. Открыть страницы истории, фильтр по спорту, сводку и публичный профиль.
     * ПРОВЕРЯЕМ: отменённые и снятые исключены; всего два посещения, порядок, страницы и счётчики по спорту.
     * ПОЧЕМУ ВАЖНО: планы на будущие встречи и отмены не должны увеличивать число посещений.
     */
    @Test void singleAndSeriesHistoryUsesOccurrencesAndPublication() {
        var author = api.newUser("historyAuthor");
        var user = api.newUser("historyUser");
        var admin = api.newAdmin();
        var single = author.createEvent(EventForm.free().sport(TestApi.uniqueName("Спорт")));
        user.joinEvent(single.id());
        var start = LocalDate.now(ZoneOffset.UTC).plusDays(3);
        var schedule = new ScheduleRequest("UTC", start, start.plusDays(2),
                List.of(new ScheduleRuleRequest(start.atTime(10, 0), 60, "FREQ=DAILY;COUNT=3")));
        var series = author.createEvent(EventForm.free().sport(TestApi.uniqueName("Серия" )).schedule(schedule));
        user.joinEvent(series.id());
        var dates = author.occurrences(series.id());
        user.attend(series.id(), dates.get(0).id());
        user.attend(series.id(), dates.get(1).id());
        author.cancelOccurrence(series.id(), dates.get(1).id(), "Отмена занятия");
        var hidden = author.createEvent(EventForm.free());
        user.joinEvent(hidden.id());
        admin.unpublishEvent(hidden.id(), "Проверка площадки");
        moveToPast(author.occurrences(single.id()).getFirst().id(), 3);
        moveToPast(dates.get(0).id(), 2);
        moveToPast(dates.get(1).id(), 1);
        moveToPast(author.occurrences(hidden.id()).getFirst().id(), 1);
        var first = user.history(Map.of("size", "1"));
        assertThat(first.totalElements()).isEqualTo(2);
        assertThat(first.totalPages()).isEqualTo(2);
        assertThat(first.items()).extracting(r -> r.event().id()).containsExactly(series.id());
        assertThat(user.history(Map.of("size", "1", "page", "1")).items())
                .extracting(r -> r.event().id()).containsExactly(single.id());
        assertThat(user.history(Map.of("sportId", single.sport().id().toString())).items())
                .extracting(r -> r.event().id()).containsExactly(single.id());
        var summary = user.historySummary(Map.of());
        assertThat(summary.total()).isEqualTo(2);
        assertThat(summary.bySport()).hasSize(2).allSatisfy(s -> assertThat(s.count()).isEqualTo(1));
        assertThat(author.openUser(user.id()).attendedCount()).isEqualTo(2);
        assertThat(author.historySummary(Map.of()).total()).isZero();
    }

    /**
     * ФЛОУ: фильтр периода обрабатывает границы и пустую будущую историю.
     * ШАГИ: 1. Подготовить посещение вчера. 2. Запросить период вокруг него и отдельные будущие границы.
     * 3. Передать равные и обратные явные границы, затем обратиться без входа.
     * ПРОВЕРЯЕМ: период [from,to), ограничение будущего текущим моментом, 400 только для неверной пары и 401 гостю.
     * ПОЧЕМУ ВАЖНО: самостоятельная будущая граница должна давать пустой результат, а не ошибку формы.
     */
    @Test void periodValidationAndAuthentication() {
        var author = api.newUser("periodAuthor");
        var user = api.newUser("periodUser");
        var event = author.createEvent(EventForm.free());
        user.joinEvent(event.id());
        moveToPast(author.occurrences(event.id()).getFirst().id(), 1);
        var now = Instant.now();
        var from = now.minus(Duration.ofDays(2)).toString();
        var to = now.plus(Duration.ofDays(2)).toString();
        assertThat(user.history(Map.of("from", from, "to", to)).totalElements()).isEqualTo(1);
        assertThat(user.historySummary(Map.of("from", to)).total()).isZero();
        assertThat(user.history(Map.of("to", from)).items()).isEmpty();
        var occurrence = occurrences.findByEventIdOrderByStartAt(event.id()).getFirst();
        assertThat(user.history(Map.of("to", occurrence.getStartAt().toString())).items()).isEmpty();
        assertThat(user.historySummary(Map.of("from", occurrence.getStartAt().toString())).total()).isEqualTo(1);
        assertThat(user.history(Map.of("from", to, "to", now.plus(Duration.ofDays(3)).toString())).items()).isEmpty();
        assertThatApi(() -> user.history(Map.of("from", to, "to", from)))
                .fails(BAD_REQUEST, "Начало периода должно быть раньше конца");
        assertThatApi(() -> user.historySummary(Map.of("from", to, "to", to)))
                .fails(BAD_REQUEST, "Начало периода должно быть раньше конца");
        assertThatApi(() -> api.guest().history(Map.of())).fails(UNAUTHORIZED);
    }
}
