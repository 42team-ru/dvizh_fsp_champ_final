package com.hackathon.app.e2e;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Map;

import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.PetLookResponse;
import com.hackathon.app.domain.enums.LedgerKind;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.service.WalletService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/** Публичные образы подтверждённых участников на общей поляне события. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class EventGoingCrowdE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired WalletService wallet;

    /**
     * ФЛОУ: посетитель видит участников встречи с их собственными бобрами и стандартным образом у новичка.
     * ШАГИ: 1. Создать автора, двух участников и отдельного зрителя; опубликовать FREE-встречу.
     *   2. Первому участнику начислить монеты, купить мяч, сохранить одежду, фон и имя бобра.
     *   3. Записать обоих участников; открыть событие посторонним зрителем и сравнить образы с публичным API.
     *   4. Сменить образ первого участника и повторно прочитать событие.
     * ПРОВЕРЯЕМ: имя, активность и все слоты совпадают с публичным питомцем; без сохранения — Бублик, none,
     *   пустая одежда; список содержит только двух участников, обновлённый образ сразу виден зрителю.
     * ПОЧЕМУ ВАЖНО: поляна должна показывать настоящие образы людей без личных причин настроения,
     *   а новый участник без гардероба должен отображаться полноценным бобром.
     */
    @Test
    void exposesSavedAndDefaultParticipantLooksToAnotherViewer() {
        var api = new TestApi(mvc, json, users, passwords);
        var author = api.newUser("crowdAuthor");
        var dressed = api.newUser("crowdDressed");
        var beginner = api.newUser("crowdBeginner");
        var viewer = api.newUser("crowdViewer");
        var eventId = author.createEvent(EventForm.free()).id();

        // Подготовка баланса идёт через настоящий журнал, покупка и сохранение — через API.
        wallet.apply(dressed.id(), 200, LedgerKind.ADJUSTMENT, "test:" + dressed.id(),
                "Начальный баланс", null, null, Instant.now());
        dressed.buyPetItem("activity:juggle");
        var outfit = Map.of("shirt", "training", "hat", "headband", "background", "meadow");
        dressed.savePet(new PetRequest("juggle", outfit));
        dressed.renamePet("Капитан");
        dressed.joinEvent(eventId);
        beginner.joinEvent(eventId);

        var event = viewer.openEvent(eventId);
        assertThat(event.participantsCount()).isEqualTo(2);
        assertThat(event.participants()).hasSize(2);
        assertThat(event.participants()).filteredOn(p -> p.id().equals(dressed.id())).singleElement().satisfies(p -> {
            assertThat(p.username()).isEqualTo(dressed.username());
            assertThat(p.pet().name()).isEqualTo("Капитан");
            assertThat(p.pet().activity()).isEqualTo("juggle");
            assertThat(p.pet().outfit()).isEqualTo(outfit);
            var publicPet = viewer.petOf(dressed.id());
            assertThat(p.pet()).isEqualTo(new PetLookResponse(publicPet.name(), publicPet.activity(), publicPet.outfit()));
            assertThat(publicPet.status()).isNull();
        });
        assertThat(event.participants()).filteredOn(p -> p.id().equals(beginner.id())).singleElement().satisfies(p -> {
            assertThat(p.pet().name()).isEqualTo("Бублик");
            assertThat(p.pet().activity()).isEqualTo("none");
            assertThat(p.pet().outfit()).isEmpty();
        });

        dressed.savePet(new PetRequest("none", Map.of("hat", "headband")));
        assertThat(viewer.openEvent(eventId).participants()).filteredOn(p -> p.id().equals(dressed.id()))
                .singleElement().satisfies(p -> {
                    assertThat(p.pet().name()).isEqualTo("Капитан");
                    assertThat(p.pet().activity()).isEqualTo("none");
                    assertThat(p.pet().outfit()).containsExactlyEntriesOf(Map.of("hat", "headband"));
                });
    }
}
