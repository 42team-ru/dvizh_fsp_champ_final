package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import java.time.Instant;
import java.util.Map;
import java.util.List;
import com.hackathon.app.domain.dto.PetSaveLookRequest;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.enums.LedgerKind;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.service.WalletService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/** Примерка, атомарная покупка и личные образы. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class PetShopE2ETest {
    /** Настоящий HTTP-транспорт тестового API. */
    @Autowired MockMvc mvc;
    /** Сериализация настоящих DTO. */
    @Autowired ObjectMapper json;
    /** Подготовка аккаунтов. */
    @Autowired AppUserRepository users;
    /** Пароли тестовых аккаунтов. */
    @Autowired PasswordEncoder passwords;
    /** Подготовка начального баланса через настоящий журнал. */
    @Autowired WalletService wallet;
    /** Участники и действия сценария. */
    private TestApi api;

    @BeforeEach
    void setUp() {
        api = new TestApi(mvc, json, users, passwords);
    }

    /**
     * ФЛОУ: купить примеренное со скидкой и дополнить прежний образ без повторной оплаты.
     * ШАГИ: 1. Надеть базовую футболку и проверить отказ без денег. 2. Начислить 500 монет.
     *   3. Купить кепку и очки с повтором id и надеть. 4. Повторить покупку; проверить эксклюзив.
     *   5. Купить свисток без надевания, затем проверить покупку одной недостающей вещи без скидки.
     * ПРОВЕРЯЕМ: точная нехватка, неизменность кошелька при отказе; одно списание 104 вместо 130;
     *   прежняя футболка сохранена, все вещи выданы; повторы бесплатны, эксклюзив не выдаётся;
     *   wear=false не меняет образ, одна недостающая вещь стоит полную цену.
     * ПОЧЕМУ ВАЖНО: примерка ничего не списывает, покупка целиком атомарна и скидка касается
     *   только недостающих вещей, а надевание не стирает другие слоты.
     */
    @Test
    void purchasesTryOnAtomicallyWithDiscountAndOptionalWear() {
        var user = api.newUser("tryOnBuyer");
        user.savePet(new PetRequest("none", Map.of("shirt", "training")));
        var ids = List.of("hat:cap", "eyewear:sunglasses", "hat:cap");
        var before = user.wallet();
        assertThatApi(() -> user.buyPetSet(ids, true)).fails(CONFLICT, "Не хватает 104 монет");
        assertThat(user.wallet()).isEqualTo(before);
        wallet.apply(user.id(), 500, LedgerKind.ADJUSTMENT, "test:" + user.id(), "Начальный баланс", null, null, Instant.now());
        var funded = user.wallet();
        var pet = user.buyPetSet(ids, true);
        assertThat(pet.outfit()).containsEntry("shirt", "training").containsEntry("hat", "cap").containsEntry("eyewear", "sunglasses");
        assertThat(user.wallet().coins()).isEqualTo(396);
        assertThat(user.wallet().entries()).hasSize(funded.entries().size() + 1);
        assertThat(user.petShop().stream().filter(i -> ids.contains(i.id()))).allMatch(i -> i.owned());
        var paid = user.wallet();
        user.buyPetSet(ids, true);
        assertThat(user.wallet()).isEqualTo(paid);
        assertThatApi(() -> user.buyPetSet(List.of("hat:crown", "neck:whistle"), true))
                .fails(CONFLICT, "Эту вещь нельзя купить — Дают за 5 проведённых встреч");
        assertThat(user.wallet()).isEqualTo(paid);
        user.buyPetSet(List.of("neck:whistle"), false);
        assertThat(user.pet().outfit()).isEqualTo(pet.outfit());
        assertThat(user.wallet().coins()).isEqualTo(346);
        user.buyPetSet(List.of("hat:cap", "hat:cap", "eyewear:goggles"), true);
        assertThat(user.wallet().coins()).isEqualTo(286);
    }

    /**
     * ФЛОУ: владелец сохраняет до четырёх личных образов только из своего гардероба.
     * ШАГИ: 1. Попытаться сохранить некупленную кепку. 2. Сохранить четыре базовых образа.
     *   3. Сохранить пятый; прочитать образы другим пользователем и удалить чужой.
     *   4. Удалить свой, сохранить замену, надеть сохранённый через существующий PUT.
     * ПРОВЕРЯЕМ: чужая вещь и пятый образ дают 409, список и надетое не меняются;
     *   у другого пользователя пустой список, чужое удаление даёт 404; после удаления место свободно.
     * ПОЧЕМУ ВАЖНО: сохранение образов не обходит экономику, личные данные изолированы,
     *   удаление освобождает один из четырёх слотов и не снимает одежду.
     */
    @Test
    void limitsLooksToFourAndChecksOwnershipAndOwner() {
        var user = api.newUser("lookOwner");
        var initial = user.pet();
        assertThatApi(() -> user.savePetLook(new PetSaveLookRequest("Чужая кепка", "none", Map.of("hat", "cap"))))
                .fails(CONFLICT, "Вещь «Кепка» ещё не твоя: купи её в магазине за 60 монет");
        assertThat(user.petLooks()).isEmpty();
        for (int i = 1; i <= 4; i++) user.savePetLook(new PetSaveLookRequest("Образ " + i, "none", Map.of("hat", "headband")));
        assertThat(user.petLooks()).hasSize(4);
        assertThat(user.pet().outfit()).isEqualTo(initial.outfit());
        assertThatApi(() -> user.savePetLook(new PetSaveLookRequest("Пятый", "none", Map.of())))
                .fails(CONFLICT, "Можно сохранить не больше 4 образов");
        var other = api.newUser("otherLookOwner");
        var first = user.petLooks().getFirst();
        assertThat(other.petLooks()).isEmpty();
        assertThatApi(() -> other.deletePetLook(first.id())).fails(NOT_FOUND, "Образ не найден");
        user.deletePetLook(first.id());
        var replacement = user.savePetLook(new PetSaveLookRequest("На прогулку", "none", Map.of("shirt", "training")));
        assertThat(user.petLooks()).hasSize(4).contains(replacement);
        assertThat(user.savePet(new PetRequest(replacement.activity(), replacement.outfit())).outfit()).isEqualTo(replacement.outfit());
    }
}
