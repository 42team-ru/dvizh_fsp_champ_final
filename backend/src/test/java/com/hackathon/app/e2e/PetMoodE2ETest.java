package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.PetMood.*;
import static com.hackathon.app.domain.enums.PetStatusReason.*;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.BAD_REQUEST;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.ScheduleRequest;
import com.hackathon.app.domain.dto.ScheduleRuleRequest;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.RegistrationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

/** Гардероб, личные эмоции и приватность бобра через настоящий API. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class PetMoodE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired EventRepository events;
    @Autowired RegistrationRepository registrations;
    @Autowired EventOccurrenceRepository occurrences;
    @Autowired DbTimeRepository time;
    @Autowired PlatformTransactionManager transactions;
    private TestApi api;

    @BeforeEach
    void setUp() {
        api = new TestApi(mvc, json, users, passwords);
    }

    /**
     * ФЛОУ: бобр участника реагирует на заявку, одобрение, приближение встречи, отказ и модерацию.
     * ШАГИ: 1. Подать заявку и одобрить. 2. Подготовить истекшее окно одобрения и приблизить встречу.
     *   3. Получить отказ в другой встрече. 4. Снять исходную встречу и прочитать состояния обеих сторон.
     * ПРОВЕРЯЕМ: thinking → wink → happy → sad; модерация приоритетнее отказа, у организаторов offended.
     * ПОЧЕМУ ВАЖНО: фраза должна объяснять реальную ситуацию и обновляться без сохранения гардероба.
     */
    @Test
    void followsRegistrationAndModerationFlow() {
        var author = api.newUser("petAuthor");
        var participant = api.newUser("petParticipant");
        var coOrganizer = api.newUser("petCoOrganizer");
        var admin = api.newAdmin();
        var form = EventForm.byRequest().startsIn(Duration.ofDays(5));
        var event = author.createEvent(form);
        author.addOrganizer(event.id(), coOrganizer.username());
        var request = participant.joinEvent(event.id());
        assertThat(participant.pet().mood()).isEqualTo(THINKING);
        assertThat(participant.pet().status().message()).isEqualTo("Жду ответа по «" + event.title() + "»");
        coOrganizer.approve(request.id());
        assertThat(participant.pet().mood()).isEqualTo(WINK);
        assertThat(participant.pet().status().message()).isEqualTo("Меня приняли на «" + event.title() + "»!");

        // Старая дата решения — подготовка границы, а не ожидание суток в тесте.
        var saved = registrations.findById(request.id()).orElseThrow();
        saved.setDecidedAt(Instant.now().minus(Duration.ofHours(25)));
        registrations.saveAndFlush(saved);
        author.updateEvent(event.id(), form.startsIn(Duration.ofHours(2)));
        assertThat(participant.pet().mood()).isEqualTo(HAPPY);
        assertThat(participant.pet().status().message()).startsWith("Скоро «" + event.title() + "» — ").endsWith("!");

        var other = author.createEvent(EventForm.byRequest().startsIn(Duration.ofDays(6)));
        var rejected = participant.joinEvent(other.id());
        author.reject(rejected.id(), "Нужен опыт");
        assertThat(participant.pet().mood()).isEqualTo(SAD);
        assertThat(participant.pet().status().message()).isEqualTo("Не взяли на «" + other.title() + "»: Нужен опыт");
        admin.unpublishEvent(event.id(), "Площадка закрыта");
        assertThat(author.pet().mood()).isEqualTo(OFFENDED);
        assertThat(coOrganizer.pet().status().reason()).isEqualTo(ORGANIZED_EVENT_MODERATED);
        assertThat(author.pet().status().message()).isEqualTo("Мою встречу «" + event.title() + "» сняли: Площадка закрыта");
        assertThat(participant.pet().status().reason()).isEqualTo(REGISTERED_EVENT_MODERATED);
        assertThat(participant.pet().status().message()).isEqualTo("Встречу «" + event.title() + "» отменили: Площадка закрыта");
    }

    /**
     * ФЛОУ: истёкшие решения и модерация перестают влиять; гардероб не раскрывает личную причину.
     * ШАГИ: 1. Сохранить образ без mood и проверить неизвестную вещь. 2. Одобрить заявку и проверить сутки.
     *   3. Подготовить отказ на границе трёх суток и снятие на границе семи суток; сдвинуть за окно.
     * ПРОВЕРЯЕМ: границы и приоритет модерации, атомарный 400, mood=idle и отсутствие status в публичном JSON.
     * ПОЧЕМУ ВАЖНО: старые неприятности должны забываться, а личные решения не должны попадать в чужой профиль.
     */
    @Test
    void expiresSignalsAndKeepsPublicOutfitPrivate() {
        var author = api.newUser("petBoundaryAuthor");
        var user = api.newUser("petBoundaryUser");
        var admin = api.newAdmin();
        var outfit = new PetRequest("none", Map.of("shirt", "training", "hat", "headband"));
        assertThat(user.savePet(outfit).outfit()).isEqualTo(outfit.outfit());
        assertThat(user.petCatalog().slots()).extracting(s -> s.id()).doesNotContain("mood", "gloves", "back");
        assertThatApi(() -> user.savePet(new PetRequest("hockey", Map.of("hat", "missing"))))
                .fails(BAD_REQUEST, "Нет вещи «missing» в слоте «Головной убор»");
        assertThat(user.pet().outfit()).isEqualTo(outfit.outfit());
        assertThat(author.petOf(user.id()).mood()).isEqualTo(IDLE);
        assertThat(author.petOf(user.id()).status()).isNull();
        assertThat(json.writeValueAsString(author.petOf(user.id()))).doesNotContain("status");

        var event = author.createEvent(EventForm.byRequest().startsIn(Duration.ofDays(5)));
        var request = user.joinEvent(event.id());
        author.approve(request.id());
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            var now = time.now();
            var r = registrations.findById(request.id()).orElseThrow();
            r.setDecidedAt(now.minus(Duration.ofHours(24)).plusSeconds(1));
            registrations.saveAndFlush(r);
            assertThat(user.pet().mood()).isEqualTo(WINK);
            r.setDecidedAt(now.minus(Duration.ofHours(24)).minusSeconds(1));
            registrations.saveAndFlush(r);
            assertThat(user.pet().mood()).isEqualTo(IDLE);
            r.setStatus(RegistrationStatus.REJECTED);
            r.setDecisionReason(null);
            r.setDecidedAt(now.minus(Duration.ofDays(3)).plusSeconds(1));
            registrations.saveAndFlush(r);
            assertThat(user.pet().status().message()).isEqualTo("Не взяли на «" + event.title() + "»");
            r.setDecidedAt(now.minus(Duration.ofDays(3)).minusSeconds(1));
            registrations.saveAndFlush(r);
            assertThat(user.pet().mood()).isEqualTo(IDLE);
        });
        // Возвращаем ожидающую заявку: участник тоже должен заметить снятие встречи.
        var r = registrations.findById(request.id()).orElseThrow();
        r.setStatus(RegistrationStatus.PENDING);
        registrations.saveAndFlush(r);
        admin.unpublishEvent(event.id(), "Ремонт");
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            var now = time.now();
            var e = events.findById(event.id()).orElseThrow();
            e.setModeratedAt(now.minus(Duration.ofDays(7)).plusSeconds(1));
            events.saveAndFlush(e);
            assertThat(user.pet().mood()).isEqualTo(SAD);
            assertThat(author.pet().mood()).isEqualTo(OFFENDED);
            e.setModeratedAt(now.minus(Duration.ofDays(7)).minusSeconds(1));
            events.saveAndFlush(e);
            assertThat(user.pet().mood()).isEqualTo(IDLE);
            assertThat(author.pet().mood()).isEqualTo(IDLE);
        });
    }

    /**
     * ФЛОУ: организатор видит количество заявок с правильным склонением; отсутствие активности усыпляет бобра.
     * ШАГИ: 1. Подать 1, 2 и 5 заявок. 2. Создать встречу дальше 48 часов и приблизить её.
     *   3. Убрать будущие встречи и состарить последние действия на 14 дней.
     * ПРОВЕРЯЕМ: surprised, русские числительные, happy только в окне 48 часов, sleep только после 14 дней.
     * ПОЧЕМУ ВАЖНО: бобр помогает вовремя разобрать заявки и не считает недавние действия бездействием.
     */
    @Test
    void countsRequestsAndRespectsUpcomingAndInactivityWindows() {
        var author = api.newUser("petCountAuthor");
        var event = author.createEvent(EventForm.byRequest().startsIn(Duration.ofDays(8)));
        var first = api.newUser("petFirst");
        first.joinEvent(event.id());
        assertThat(author.pet().mood()).isEqualTo(SURPRISED);
        assertThat(author.pet().status().message()).isEqualTo("1 новая заявка на «" + event.title() + "»");
        api.newUser("petSecond").joinEvent(event.id());
        assertThat(author.pet().status().message()).startsWith("2 новые заявки");
        for (int i = 0; i < 3; i++) api.newUser("petExtra").joinEvent(event.id());
        assertThat(author.pet().status().message()).startsWith("5 новых заявок");

        var soon = author.createEvent(EventForm.free().startsIn(Duration.ofHours(49)));
        first.joinEvent(soon.id());
        // PENDING имеет приоритет над спокойным состоянием, но не над скорой встречей.
        assertThat(first.pet().mood()).isEqualTo(THINKING);
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            var now = time.now();
            var occurrence = occurrences.findByEventIdOrderByStartAt(soon.id()).getFirst();
            occurrence.setStartAt(now.plus(Duration.ofHours(48)).minusSeconds(1));
            occurrences.saveAndFlush(occurrence);
            assertThat(first.pet().mood()).isEqualTo(HAPPY);
            occurrence.setStartAt(now.plus(Duration.ofHours(48)).plusSeconds(1));
            occurrences.saveAndFlush(occurrence);
            assertThat(first.pet().mood()).isEqualTo(THINKING);
        });
        var inactive = api.newUser("petInactive");
        assertThat(inactive.pet().mood()).isEqualTo(SLEEP);
        var past = inactive.createEvent(EventForm.free());
        assertThat(inactive.pet().mood()).isEqualTo(IDLE);
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            var now = time.now();
            var e = events.findById(past.id()).orElseThrow();
            var occurrence = occurrences.findByEventIdOrderByStartAt(past.id()).getFirst();
            occurrence.setStartAt(now.minusSeconds(1));
            occurrences.saveAndFlush(occurrence);
            e.setCreatedAt(now.minus(Duration.ofDays(14)).plusSeconds(1));
            events.saveAndFlush(e);
            assertThat(inactive.pet().mood()).isEqualTo(IDLE);
            e.setCreatedAt(now.minus(Duration.ofDays(14)).minusSeconds(1));
            events.saveAndFlush(e);
            assertThat(inactive.pet().status().reason()).isEqualTo(INACTIVE);
            assertThat(inactive.pet().status().message()).isEqualTo("Давно не тренировались… Найдём компанию?");
        });
    }
    /**
     * ФЛОУ: вступивший в серию участник ждёт ближайшее занятие в часовом поясе серии.
     * ШАГИ: 1. Создать еженедельную серию во Владивостоке. 2. Подготовить уже прошедшее первое начало серии.
     *   3. Вступить и проверить happy на завтра; отменить ближайшее занятие и проверить следующую дату.
     * ПРОВЕРЯЕМ: дата и 10:00 локальны, устаревшее Event.startAt не мешает, отмена убирает happy.
     * ПОЧЕМУ ВАЖНО: серия живёт дольше первого занятия, а отменённая дата не должна звать участника на встречу.
     */
    @Test
    void usesNextScheduledOccurrenceAndEventTimeZone() {
        var author = api.newUser("petSeriesAuthor");
        var user = api.newUser("petSeriesUser");
        var zone = ZoneId.of("Asia/Vladivostok");
        var tomorrow = LocalDate.now(zone).plusDays(1);
        var schedule = new ScheduleRequest(zone.getId(), tomorrow, tomorrow.plusDays(14),
                List.of(new ScheduleRuleRequest(tomorrow.atTime(10, 0), 60, "FREQ=WEEKLY;COUNT=2")));
        var event = author.createEvent(EventForm.free().schedule(schedule));
        var e = events.findById(event.id()).orElseThrow();
        e.setStartAt(Instant.now().minus(Duration.ofDays(7)));
        events.saveAndFlush(e);
        user.joinEvent(event.id());
        assertThat(user.pet().mood()).isEqualTo(HAPPY);
        assertThat(user.pet().status().message()).isEqualTo("Скоро «" + event.title() + "» — завтра в 10:00!");
        var first = author.occurrences(event.id()).getFirst();
        author.cancelOccurrence(event.id(), first.id(), "Зал закрыт");
        assertThat(user.pet().mood()).isEqualTo(IDLE);
        assertThat(user.pet().status().message()).isEqualTo("Ближайшая встреча: «" + event.title() + "» "
                + tomorrow.plusDays(7).format(DateTimeFormatter.ofPattern("dd.MM.yyyy")));
    }

}
