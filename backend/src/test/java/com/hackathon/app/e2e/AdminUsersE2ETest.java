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
class AdminUsersE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    private TestApi api;
    @BeforeEach void setUp() { api = new TestApi(mvc, json, users, passwords); }

    /**
     * ФЛОУ: администратор ищет пользователей и видит счётчики активности.
     * ШАГИ: 1. Создать USER и ORG с общим префиксом, создать встречи и записи разных статусов.
     * 2. Искать по логину и email с другим регистром, отфильтровать роль и перейти по страницам.
     * ПРОВЕРЯЕМ: новые сверху, страницы считают всех совпавших, созданные встречи и только CONFIRMED в счётчиках.
     * ПОЧЕМУ ВАЖНО: администратору нужны точные данные без смешивания заявок и подтверждённых участников.
     */
    @Test void searchRolePagingAndGroupedCounts() {
        var admin = api.newAdmin();
        var prefix = TestApi.uniqueName("lookup");
        var user = api.newUser(prefix);
        var org = api.newOrganization(prefix);
        var author = api.newUser("adminAuthor");
        user.createEvent(EventForm.free());
        user.joinEvent(author.createEvent(EventForm.free()).id());
        user.joinEvent(author.createEvent(EventForm.byRequest()).id());
        var page = admin.adminUsers(Map.of("searchText", prefix.toUpperCase(Locale.ROOT), "size", "1"));
        assertThat(page.totalElements()).isEqualTo(2);
        assertThat(page.items()).extracting(AdminUserResponse::id).containsExactly(org.id());
        assertThat(admin.adminUsers(Map.of("searchText", prefix, "page", "1", "size", "1")).items())
                .extracting(AdminUserResponse::id).containsExactly(user.id());
        var found = admin.adminUsers(Map.of("searchText", user.username().toUpperCase(Locale.ROOT) + "@EXAMPLE.COM", "role", "USER"));
        assertThat(found.items()).singleElement().satisfies(u -> {
            assertThat(u.id()).isEqualTo(user.id());
            assertThat(u.eventsCount()).isEqualTo(1);
            assertThat(u.registrationsCount()).isEqualTo(1);
            assertThat(u.active()).isTrue();
            assertThat(u.createdAt()).isNotNull();
        });
        assertThat(admin.adminUsers(Map.of("searchText", prefix, "role", "ADMIN")).items()).isEmpty();
        assertThat(admin.adminUsers(Map.of("searchText", prefix, "size", "101")).size()).isEqualTo(100);
    }

    /**
     * ФЛОУ: персональные сведения доступны только администратору.
     * ШАГИ: 1. Запросить список обычным пользователем и организацией. 2. Повторить без входа.
     * ПРОВЕРЯЕМ: 403 для USER и ORG, 401 для гостя; список не раскрывается.
     * ПОЧЕМУ ВАЖНО: email и административные сведения не должны становиться публичным поиском людей.
     */
    @Test void adminOnly() {
        assertThatApi(() -> api.newUser("deniedUser").adminUsers(Map.of())).fails(FORBIDDEN);
        assertThatApi(() -> api.newOrganization("deniedOrg").adminUsers(Map.of())).fails(FORBIDDEN);
        assertThatApi(() -> api.guest().adminUsers(Map.of())).fails(UNAUTHORIZED);
    }
}
