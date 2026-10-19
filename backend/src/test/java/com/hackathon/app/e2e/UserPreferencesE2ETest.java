package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static java.time.DayOfWeek.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

import java.util.Arrays;
import java.util.List;

import com.hackathon.app.domain.dto.HelpersPreferences;
import com.hackathon.app.domain.dto.SaveUserPreferencesRequest;
import com.hackathon.app.domain.dto.SaveUserSportsRequest;
import com.hackathon.app.domain.dto.UserPreferencesResponse;
import com.hackathon.app.domain.dto.UserSportRequest;
import com.hackathon.app.domain.enums.Daytime;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.UserPreferencesRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
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
class UserPreferencesE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired UserPreferencesRepository preferences;
    TestApi api;

    @BeforeEach
    void setUp() {
        api = new TestApi(mvc, json, users, passwords);
    }

    /**
     * ФЛОУ: новый пользователь настраивает онбординг и позднее полностью меняет предпочтения.
     * ШАГИ: 1. Зарегистрировать USER, прочитать дефолты и проверить отсутствие строки в БД.
     * 2. Сохранить предпочтения с повторяющимися днями в обратном порядке и перечитать.
     * 3. Заменить все настройки, выключив помощников, и снова прочитать их.
     * ПРОВЕРЯЕМ: дефолты совпадают с фронтом; дни уникальны и упорядочены; старые дни удалены;
     * false сохраняется, после замены остаётся прежний id настроек.
     * ПОЧЕМУ ВАЖНО: настройки сохраняются между посещениями, а чтение не создаёт данные.
     */
    @Test
    void defaultsAreReadOnlyAndSavedPreferencesCanBeReplaced() {
        var owner = api.newUser("prefs");
        assertThat(owner.myPreferences()).isEqualTo(new UserPreferencesResponse(SportLevel.AMATEUR,
                List.of(TUESDAY, THURSDAY, SATURDAY), Daytime.EVENING, 5,
                new HelpersPreferences(true, true, false)));
        assertThat(preferences.findByUserId(owner.id())).isEmpty();

        var saved = owner.saveMyPreferences(new SaveUserPreferencesRequest(SportLevel.BEGINNER,
                List.of(SUNDAY, MONDAY, SUNDAY), Daytime.MORNING, 1, new HelpersPreferences(true, false, true)));
        assertThat(saved).isEqualTo(new UserPreferencesResponse(SportLevel.BEGINNER,
                List.of(MONDAY, SUNDAY), Daytime.MORNING, 1, new HelpersPreferences(true, false, true)));
        assertThat(owner.myPreferences()).isEqualTo(saved);
        var originalId = preferences.findByUserId(owner.id()).orElseThrow().getId();

        var replaced = owner.saveMyPreferences(new SaveUserPreferencesRequest(SportLevel.PRO,
                List.of(WEDNESDAY), Daytime.DAY, 20, new HelpersPreferences(false, false, false)));
        assertThat(replaced).isEqualTo(new UserPreferencesResponse(SportLevel.PRO,
                List.of(WEDNESDAY), Daytime.DAY, 20, new HelpersPreferences(false, false, false)));
        assertThat(owner.myPreferences()).isEqualTo(replaced);
        assertThat(preferences.findByUserId(owner.id()).orElseThrow().getId()).isEqualTo(originalId);
    }

    /**
     * ФЛОУ: некорректная форма не стирает ранее выбранные настройки.
     * ШАГИ: 1. Сохранить валидные предпочтения.
     * 2. Отправить радиусы вне диапазона, пустые дни, null в обязательных полях и внутри helpers/days.
     * 3. После каждого отказа перечитать предпочтения.
     * ПРОВЕРЯЕМ: формы отклоняются с 400, сохранённое состояние остаётся прежним.
     * ПОЧЕМУ ВАЖНО: неполный запрос не должен сбрасывать настройки пользователя.
     */
    @Test
    void invalidReplacementKeepsExistingPreferences() {
        var owner = api.newUser("invalidPrefs");
        var valid = form();
        var saved = owner.saveMyPreferences(valid);
        var invalid = List.of(
                new SaveUserPreferencesRequest(valid.level(), valid.days(), valid.daytime(), 0, valid.helpers()),
                new SaveUserPreferencesRequest(valid.level(), valid.days(), valid.daytime(), 21, valid.helpers()),
                new SaveUserPreferencesRequest(valid.level(), List.of(), valid.daytime(), 5, valid.helpers()),
                new SaveUserPreferencesRequest(null, valid.days(), valid.daytime(), 5, valid.helpers()),
                new SaveUserPreferencesRequest(valid.level(), null, valid.daytime(), 5, valid.helpers()),
                new SaveUserPreferencesRequest(valid.level(), Arrays.asList(MONDAY, null), valid.daytime(), 5, valid.helpers()),
                new SaveUserPreferencesRequest(valid.level(), valid.days(), null, 5, valid.helpers()),
                new SaveUserPreferencesRequest(valid.level(), valid.days(), valid.daytime(), null, valid.helpers()),
                new SaveUserPreferencesRequest(valid.level(), valid.days(), valid.daytime(), 5, null),
                new SaveUserPreferencesRequest(valid.level(), valid.days(), valid.daytime(), 5, new HelpersPreferences(null, true, false)),
                new SaveUserPreferencesRequest(valid.level(), valid.days(), valid.daytime(), 5, new HelpersPreferences(true, null, false)),
                new SaveUserPreferencesRequest(valid.level(), valid.days(), valid.daytime(), 5, new HelpersPreferences(true, true, null)));
        for (var request : invalid) {
            assertThatApi(() -> owner.saveMyPreferences(request)).fails(BAD_REQUEST);
            assertThat(owner.myPreferences()).isEqualTo(saved);
        }
    }

    /**
     * ФЛОУ: предпочтения изолированы между аккаунтами и от спортивных интересов.
     * ШАГИ: 1. Создать двух USER; первый сохраняет UserSport с уровнем PRO и общие настройки BEGINNER.
     * 2. Изменить уровень UserSport; второму USER сохранить другие настройки.
     * 3. Сохранить настройки ORG и ADMIN; проверить отказ чтения и записи для гостя.
     * ПРОВЕРЯЕМ: общий и спортивный уровни независимы; настройки пользователей не смешиваются;
     * доступ одинаков для ролей профиля, без входа оба метода возвращают 401.
     * ПОЧЕМУ ВАЖНО: онбординг не должен менять чужие данные или ломать существующие интересы.
     */
    @Test
    void preferencesArePrivateAndIndependentOfSportsForAllProfileRoles() {
        var owner = api.newUser("prefsOwner");
        var other = api.newUser("prefsOther");
        var sports = owner.saveMySports(new SaveUserSportsRequest(List.of(
                new UserSportRequest(null, TestApi.uniqueName("Спорт "), SportLevel.PRO))));
        var saved = owner.saveMyPreferences(form());
        assertThat(owner.mySports()).isEqualTo(sports);
        owner.saveMySports(new SaveUserSportsRequest(List.of(
                new UserSportRequest(sports.getFirst().sport().id(), null, SportLevel.ADVANCED))));
        assertThat(owner.myPreferences()).isEqualTo(saved);
        assertThat(other.myPreferences().level()).isEqualTo(SportLevel.AMATEUR);
        var otherSaved = other.saveMyPreferences(new SaveUserPreferencesRequest(SportLevel.ADVANCED,
                List.of(FRIDAY), Daytime.DAY, 12, new HelpersPreferences(false, true, true)));
        assertThat(other.myPreferences()).isEqualTo(otherSaved);
        assertThat(owner.myPreferences()).isEqualTo(saved);
        assertThat(other.mySports()).isEmpty();
        for (var actor : List.of(api.newOrganization("prefsOrg"), api.newAdmin())) {
            assertThat(actor.saveMyPreferences(form())).isEqualTo(saved);
            assertThat(actor.myPreferences()).isEqualTo(saved);
        }
        assertThatApi(() -> api.guest().myPreferences()).fails(UNAUTHORIZED);
        assertThatApi(() -> api.guest().saveMyPreferences(form())).fails(UNAUTHORIZED);
    }

    private SaveUserPreferencesRequest form() {
        return new SaveUserPreferencesRequest(SportLevel.BEGINNER, List.of(MONDAY), Daytime.MORNING,
                5, new HelpersPreferences(true, true, false));
    }
}
