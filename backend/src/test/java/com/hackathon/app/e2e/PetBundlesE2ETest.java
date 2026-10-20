package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

import java.time.Instant;
import java.util.Map;
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

/** Комплекты: персональная скидка, повторное надевание и атомарные отказы. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class PetBundlesE2ETest {
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
     * ФЛОУ: пользователь докупает комплект, часть вещей которого уже есть, и надевает его повторно.
     * ШАГИ: 1. Начислить монеты и купить свисток отдельно. 2. Проверить отсутствие скидки на одну
     *   недостающую вещь фитнеса. 3. Проверить округление цены лыж, купить шапку отдельно и докупить комплект.
     *   4. Проверить баланс, журнал, инвентарь и полный образ. 5. Снять образ и снова надеть комплект.
     * ПРОВЕРЯЕМ: базовая вещь бесплатна, своя вещь не покупается повторно; скидка 20% округлена вниз
     *   (290 → 232), при купленной шапке цена 176 вместо 220, списание одно; свисток снят, повтор бесплатен.
     * ПОЧЕМУ ВАЖНО: покупатель платит только за недостающее и получает весь образ одной операцией,
     *   а кнопка «Надеть» никогда не списывает деньги повторно.
     */
    @Test
    void buysMissingItemsWithDiscountAndWearsAgainForFree() {
        var user = api.newUser("bundleBuyer");
        wallet.apply(user.id(), 1000, LedgerKind.ADJUSTMENT, "test:" + user.id(), "Начальный баланс",
                null, null, Instant.now());
        user.buyPetItem("neck:whistle");
        user.savePet(new PetRequest("none", Map.of("neck", "whistle")));
        var fitness = user.petBundles().stream().filter(b -> b.code().equals("fitness")).findFirst().orElseThrow();
        assertThat(fitness.missingCount()).isEqualTo(1);
        assertThat(fitness.fullPrice()).isEqualTo(120);
        assertThat(fitness.price()).isEqualTo(120);
        var initialSki = user.petBundles().stream().filter(b -> b.code().equals("ski")).findFirst().orElseThrow();
        assertThat(initialSki.fullPrice()).isEqualTo(290);
        assertThat(initialSki.price()).isEqualTo(232);
        user.buyPetItem("hat:beanie");
        var bundle = user.petBundles().stream().filter(b -> b.code().equals("ski")).findFirst().orElseThrow();
        assertThat(bundle.items()).hasSize(4);
        assertThat(bundle.missingCount()).isEqualTo(2);
        assertThat(bundle.fullPrice()).isEqualTo(220);
        assertThat(bundle.price()).isEqualTo(176);
        assertThat(bundle.locked()).isFalse();
        var before = user.wallet();
        var pet = user.buyPetBundle("ski");
        assertThat(pet.outfit()).isEqualTo(bundle.outfit());
        assertThat(pet.activity()).isEqualTo("ski");
        assertThat(user.pet().outfit()).isEqualTo(bundle.outfit());
        assertThat(user.wallet().coins()).isEqualTo(before.coins() - 176);
        assertThat(user.wallet().entries()).hasSize(before.entries().size() + 1)
                .anySatisfy(entry -> {
                    assertThat(entry.note()).isEqualTo("Покупка комплекта: Лыжи");
                    assertThat(entry.kind()).isEqualTo(LedgerKind.PURCHASE);
                    assertThat(entry.amount()).isEqualTo(-176);
                });
        assertThat(user.petShop().stream().filter(i -> bundle.items().stream().anyMatch(b -> b.id().equals(i.id()))))
                .allMatch(i -> i.owned());
        var owned = user.petBundles().stream().filter(b -> b.code().equals("ski")).findFirst().orElseThrow();
        assertThat(owned.owned()).isTrue();
        assertThat(owned.price()).isZero();
        assertThat(owned.missingCount()).isZero();
        var paid = user.wallet();
        user.savePet(new PetRequest("none", Map.of()));
        assertThat(user.buyPetBundle("ski").outfit()).isEqualTo(bundle.outfit());
        assertThat(user.pet().activity()).isEqualTo("ski");
        assertThat(user.wallet()).isEqualTo(paid);
    }

    /**
     * ФЛОУ: покупка невозможна без денег, достижения, личного аккаунта или существующего кода.
     * ШАГИ: 1. Сохранить базовый образ нового пользователя. 2. Купить футбол без монет.
     *   3. Начислить достаточно монет и попытаться купить бег с эксклюзивной медалью.
     *   4. Проверить неизвестный код, затем чтение и покупку от организации.
     * ПРОВЕРЯЕМ: 409 с русской причиной, ни одной выданной вещи или операции при отказе,
     *   прежний образ сохранён; эксклюзив помечает комплект заблокированным; ORG получает 403, код — 404.
     * ПОЧЕМУ ВАЖНО: отказ не должен частично списывать монеты, выдавать вещи или менять питомца;
     *   комплекты не позволяют обойти достижения и ограничения роли.
     */
    @Test
    void rejectsPurchasesAtomicallyAndEnforcesRoleAndCatalog() {
        var user = api.newUser("bundleErrors");
        var pet = user.savePet(new PetRequest("none", Map.of("hat", "headband")));
        var items = user.petShop();
        var emptyWallet = user.wallet();
        assertThatApi(() -> user.buyPetBundle("football"))
                .fails(CONFLICT, "Не хватает монет: нужно 224, у тебя 0");
        assertThat(user.wallet()).isEqualTo(emptyWallet);
        assertThat(user.petShop()).isEqualTo(items);
        assertThat(user.pet().outfit()).isEqualTo(pet.outfit());
        wallet.apply(user.id(), 1000, LedgerKind.ADJUSTMENT, "test:" + user.id(), "Начальный баланс",
                null, null, Instant.now());
        var funded = user.wallet();
        var running = user.petBundles().stream().filter(b -> b.code().equals("running")).findFirst().orElseThrow();
        assertThat(running.locked()).isTrue();
        assertThat(running.lockedReason()).contains("за 10 встреч");
        assertThatApi(() -> user.buyPetBundle("running")).fails(CONFLICT, running.lockedReason());
        assertThatApi(() -> user.buyPetBundle("unknown")).fails(NOT_FOUND, "Комплект «unknown» не найден");
        assertThat(user.wallet()).isEqualTo(funded);
        assertThat(user.petShop()).isEqualTo(items);
        assertThat(user.pet().outfit()).isEqualTo(pet.outfit());
        var org = api.newOrganization("bundleOrg");
        assertThatApi(org::petBundles).fails(FORBIDDEN, "Монеты и достижения есть только у личных аккаунтов");
        assertThatApi(() -> org.buyPetBundle("football"))
                .fails(FORBIDDEN, "Монеты и достижения есть только у личных аккаунтов");
    }

    /**
     * ФЛОУ: выбрать спортивную категорию, купить комплект и сменить его на другой образ.
     * ШАГИ: 1. Проверить категории, клубные формы и минимум два образа в каждой категории.
     *   2. Попробовать надеть чужие кроссовки целым образом и через один слот. 3. Начислить монеты,
     *   купить комплект для пробежки, проверить владение, цену и сохранение вещи.
     *   4. Снять и вернуть вещь, затем надеть комплект без неё и бесплатную базовую повязку.
     * ПРОВЕРЯЕМ: код и русское название категории; 409 без изменений при чужой вещи;
     *   вещь входит в число вещей и скидку, сохраняется в личном и публичном образе;
     *   повторная покупка бесплатна, отсутствие слота снимает вещь, базовая вещь доступна сразу.
     * ПОЧЕМУ ВАЖНО: категории помогают найти спорт, а вещь комплекта подчиняется той же экономике
     *   и правилам замены, что остальные: её нельзя получить бесплатно через PUT или комплект.
     */
    @Test
    void groupsSportsAndBuysOwnsAndClearsItem() {
        var user = api.newUser("bundleItem");
        var bundles = user.petBundles();
        assertThat(bundles).allSatisfy(bundle -> {
            assertThat(bundle.category().code()).isNotBlank();
            assertThat(bundle.category().label()).matches(".*[А-Яа-яЁё].*");
        });
        assertThat(bundles.stream().collect(Collectors.groupingBy(b -> b.category().code())).values())
                .allSatisfy(group -> assertThat(group).hasSizeGreaterThanOrEqualTo(2));
        assertThat(bundles.stream().filter(b -> b.code().startsWith("hc-") || b.code().equals("hockey")))
                .hasSize(10).allMatch(b -> b.category().code().equals("hockey"));
        assertThat(bundles.stream().filter(b -> b.activity().equals("juggle")))
                .hasSize(12).allMatch(b -> b.category().code().equals("football"));
        var initial = user.pet();
        var reason = "Вещь «Кроссовки» ещё не твоя: купи её в магазине за 120 монет";
        assertThatApi(() -> user.savePet(new PetRequest("none", Map.of("feet", "sneakers"))))
                .fails(CONFLICT, reason);
        assertThatApi(() -> user.equipPet("feet", "sneakers")).fails(CONFLICT, reason);
        assertThat(user.pet().outfit()).isEqualTo(initial.outfit());
        wallet.apply(user.id(), 1000, LedgerKind.ADJUSTMENT, "test:" + user.id(), "Начальный баланс",
                null, null, Instant.now());
        var running = bundles.stream().filter(b -> b.code().equals("river-run")).findFirst().orElseThrow();
        assertThat(running.category().label()).isEqualTo("Бег");
        assertThat(running.items()).hasSize(3).anyMatch(i -> i.id().equals("feet:sneakers"));
        assertThat(running.missingCount()).isEqualTo(3);
        assertThat(running.fullPrice()).isEqualTo(320);
        assertThat(running.price()).isEqualTo(256);
        assertThat(user.buyPetBundle("river-run").outfit()).isEqualTo(running.outfit());
        assertThat(user.petShop()).anySatisfy(item -> {
            assertThat(item.id()).isEqualTo("feet:sneakers");
            assertThat(item.owned()).isTrue();
        });
        assertThat(user.pet().outfit()).containsEntry("feet", "sneakers");
        assertThat(user.petOf(user.id()).outfit()).containsEntry("feet", "sneakers");
        assertThat(user.wallet().coins()).isEqualTo(744);
        var paid = user.wallet();
        user.buyPetBundle("river-run");
        assertThat(user.wallet()).isEqualTo(paid);
        assertThat(user.equipPet("feet", null).outfit()).doesNotContainKey("feet");
        assertThat(user.equipPet("feet", "sneakers").outfit()).isEqualTo(running.outfit());
        assertThat(user.buyPetBundle("winter-walk").outfit()).doesNotContainKey("feet");
        assertThat(user.equipPet("hat", "headband").outfit()).containsEntry("hat", "headband");
    }
}
