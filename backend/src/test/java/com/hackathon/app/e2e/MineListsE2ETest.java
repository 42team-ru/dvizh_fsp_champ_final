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
class MineListsE2ETest {
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
     * ФЛОУ: участник отбирает свои записи по статусу и наличию будущих занятий.
     * ШАГИ: 1. Записаться на две свободные встречи и подать заявку на третью.
     * 2. Одну встречу перенести в прошлое, у другой отменить единственное занятие.
     * 3. Проверить фильтры вместе со страницами и ограничением размера.
     * ПРОВЕРЯЕМ: PAST включает отменённое занятие; фильтры применены до подсчёта и пагинации.
     * ПОЧЕМУ ВАЖНО: пользователь должен находить нужную запись без загрузки всей истории.
     */
    @Test void registrationStatusTimeAndPages() {
        var author = api.newUser("listAuthor");
        var user = api.newUser("listUser");
        var past = author.createEvent(EventForm.free());
        var cancelled = author.createEvent(EventForm.free());
        var future = author.createEvent(EventForm.byRequest());
        user.joinEvent(past.id()); user.joinEvent(cancelled.id()); user.joinEvent(future.id());
        moveToPast(author.occurrences(past.id()).getFirst().id(), 1);
        author.cancelOccurrence(cancelled.id(), author.occurrences(cancelled.id()).getFirst().id(), "Отмена");
        var page = user.myRegistrationsPage(Map.of("status", "CONFIRMED", "when", "PAST", "size", "1"));
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.items()).extracting(r -> r.event().id()).containsExactly(cancelled.id());
        assertThat(user.myRegistrationsPage(Map.of("when", "PAST", "size", "1", "page", "1")).items())
                .extracting(r -> r.event().id()).containsExactly(past.id());
        assertThat(user.myRegistrationsPage(Map.of("status", "PENDING", "when", "UPCOMING")).items())
                .extracting(r -> r.event().id()).containsExactly(future.id());
        assertThat(user.myRegistrationsPage(Map.of("size", "1000")).size()).isEqualTo(100);
    }

    /**
     * ФЛОУ: автор и соорганизатор ищут свои мероприятия во всех статусах.
     * ШАГИ: 1. Создать свои и чужое события, добавить соорганизатора.
     * 2. Снять своё с публикации и отменить занятие. 3. Искать по регистронезависимому названию, статусу и времени.
     * ПРОВЕРЯЕМ: чужое скрыто, соорганизатор видит событие, порядок новых сверху, корректные total и пустая страница.
     * ПОЧЕМУ ВАЖНО: управление снятым событием должно оставаться доступным, а фильтры не должны терять совместные встречи.
     */
    @Test void organizedEventsSearchStatusTimeAndPages() {
        var author = api.newUser("mineAuthor");
        var co = api.newUser("mineCo");
        var admin = api.newAdmin();
        var title = TestApi.uniqueName("Training");
        var old = author.createEvent(EventForm.free().title(title + " old"));
        var recent = author.createEvent(EventForm.free().title(title + " new"));
        co.createEvent(EventForm.free().title(title + " foreign"));
        author.addOrganizer(recent.id(), co.username());
        co.acceptOrganizerInvite(recent.id());
        admin.unpublishEvent(recent.id(), "Уточнение");
        author.cancelOccurrence(recent.id(), author.occurrences(recent.id()).getFirst().id(), "Отмена");
        var page = author.myEventsPage(Map.of("searchText", title.toUpperCase(Locale.ROOT), "size", "1"));
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.items()).extracting(EventSummaryResponse::id).containsExactly(recent.id());
        assertThat(author.myEventsPage(Map.of("searchText", title, "page", "1", "size", "1")).items())
                .extracting(EventSummaryResponse::id).containsExactly(old.id());
        assertThat(co.myEventsPage(Map.of("status", "UNPUBLISHED", "when", "PAST")).items())
                .extracting(EventSummaryResponse::id).containsExactly(recent.id());
        assertThat(author.myEventsPage(Map.of("when", "UPCOMING")).items())
                .extracting(EventSummaryResponse::id).containsExactly(old.id());
        assertThat(author.myEventsPage(Map.of("page", "20")).items()).isEmpty();
    }
}
