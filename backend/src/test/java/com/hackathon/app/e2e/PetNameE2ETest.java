package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

import java.util.Map;

import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/** Личное имя бобра: сохранение, публичное чтение и границы ввода. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class PetNameE2ETest {
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
     * ФЛОУ: владелец даёт бобру имя, которое видит другой пользователь.
     * ШАГИ: 1. Проверить имя по умолчанию. 2. Сохранить одежду и имя с лишними пробелами.
     *   3. Прочитать личного и публичного бобра. 4. Сменить гардероб и сохранить имя предельной длины.
     * ПРОВЕРЯЕМ: имя нормализуется и сохраняется, гардероб и имя изменяются независимо;
     *   чужой питомец остаётся с именем по умолчанию, имя длиной 30 символов принимается.
     * ПОЧЕМУ ВАЖНО: имя не должно пропадать при переодевании или менять питомца другого человека.
     */
    @Test
    void renamesPetForOwnerAndOtherViewerWithoutChangingOutfit() {
        var owner = api.newUser("petNameOwner");
        var viewer = api.newUser("petNameViewer");
        assertThat(owner.pet().name()).isEqualTo("Бублик");
        assertThat(viewer.petOf(owner.id()).name()).isEqualTo("Бублик");
        var outfit = owner.savePet(new PetRequest("none", Map.of("hat", "cap"))).outfit();
        var renamed = owner.renamePet("  Капитан \t  Бобр  ");
        assertThat(renamed.name()).isEqualTo("Капитан Бобр");
        assertThat(renamed.outfit()).isEqualTo(outfit);
        assertThat(owner.pet().name()).isEqualTo("Капитан Бобр");
        assertThat(viewer.petOf(owner.id()).name()).isEqualTo("Капитан Бобр");
        assertThat(viewer.pet().name()).isEqualTo("Бублик");
        assertThat(owner.savePet(new PetRequest("none", Map.of())).name()).isEqualTo("Капитан Бобр");
        assertThat(owner.renamePet("  " + "я".repeat(30) + "  ").name()).isEqualTo("я".repeat(30));
    }

    /**
     * ФЛОУ: неверное имя отклоняется, переименование доступно только после входа.
     * ШАГИ: 1. Сохранить допустимое имя. 2. Отправить пробелы, 31 символ и null.
     *   3. Проверить сохранённое имя. 4. Попытаться переименовать питомца от гостя.
     * ПРОВЕРЯЕМ: ошибки 400 с точным русским detail, прежнее имя не меняется, гостю возвращается 401.
     * ПОЧЕМУ ВАЖНО: пустые и длинные имена не должны портить профиль, а гостю нельзя менять данные.
     */
    @Test
    void rejectsInvalidNamesAndGuest() {
        var owner = api.newUser("petNameValidation");
        owner.renamePet("Бобрик");
        for (var name : new String[] {" \t\n ", "я".repeat(31), null}) {
            assertThatApi(() -> owner.renamePet(name))
                    .fails(BAD_REQUEST, "Имя питомца — от 1 до 30 символов");
        }
        assertThat(owner.pet().name()).isEqualTo("Бобрик");
        assertThatApi(() -> api.guest().renamePet("Бобрик")).fails(UNAUTHORIZED);
    }
}
