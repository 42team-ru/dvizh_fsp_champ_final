package com.hackathon.app.e2e;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import com.hackathon.app.domain.enums.NotificationType;
import com.hackathon.app.e2e.support.*;
import com.hackathon.app.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;
import static org.assertj.core.api.Assertions.assertThat;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.springframework.http.HttpStatus.*;

/** Подписки, каталог и публичная статистика через настоящую цепочку API. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class OrganizationSubscriptionsE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired EventOccurrenceRepository occurrences;
    @Autowired EventRepository events;
    private TestApi api;
    @BeforeEach void setUp() { api = new TestApi(mvc, json, users, passwords); }

    /**
     * ФЛОУ: человек подписывается на проверенный клуб и получает анонс новой встречи.
     * ШАГИ: 1. Подать анкету и одобрить клуб. 2. Дважды подписаться и опубликовать встречу.
     * 3. Прочитать сводку и уведомления, дважды отписаться и опубликовать вторую встречу.
     * 4. Попробовать подписаться от ORG и ADMIN, затем на клуб PENDING и отозванный клуб.
     * ПРОВЕРЯЕМ: один подписчик и один анонс с правильной ссылкой, отсутствие второго анонса после выхода,
     * идемпотентность команд, 409 для служебных ролей, 404 для скрытых клубов и их сводки.
     * ПОЧЕМУ ВАЖНО: подписка не должна дублировать уведомления или раскрывать непроверенные организации.
     */
    @Test void subscriptionsNotifyOnceAndRespectRolesAndVisibility() {
        var admin = api.newAdmin();
        var org = api.newOrganization("subscribeClub");
        var id = org.submitOrganization(OrganizationForm.valid()).id();
        var person = api.newUser("subscriber");
        assertThatApi(() -> person.subscribeOrganization(id)).fails(NOT_FOUND, "Организация не найдена");
        admin.approveOrganization(id);
        assertThat(person.subscribeOrganization(id).subscribersCount()).isEqualTo(1);
        assertThat(person.subscribeOrganization(id).subscribed()).isTrue();
        var state = person.organizationOverview(id).subscription();
        assertThat(state.subscribed()).isTrue();
        assertThat(state.subscribersCount()).isEqualTo(1);
        assertThat(state.subscriberAvatars()).extracting(u -> u.id()).containsExactly(person.id());
        var event = org.createEvent(EventForm.free());
        var notices = person.notifications().items().stream().filter(n -> n.type() == NotificationType.ORG_NEW_EVENT).toList();
        assertThat(notices).singleElement().satisfies(n -> {
            assertThat(n.targetPath()).isEqualTo("/events/" + event.id());
            assertThat(n.body()).isEqualTo(event.title());
        });
        assertThat(person.unsubscribeOrganization(id).subscribed()).isFalse();
        assertThat(person.unsubscribeOrganization(id).subscribersCount()).isZero();
        org.createEvent(EventForm.free());
        assertThat(person.notifications().items().stream().filter(n -> n.type() == NotificationType.ORG_NEW_EVENT)).hasSize(1);
        assertThatApi(() -> org.subscribeOrganization(id)).fails(CONFLICT, "Подписываться на организации может только участник с личным аккаунтом");
        assertThatApi(() -> admin.subscribeOrganization(id)).fails(CONFLICT);
        person.subscribeOrganization(id);
        admin.rejectOrganization(id, "Допуск отозван");
        assertThatApi(() -> person.organizationOverview(id)).fails(NOT_FOUND);
        assertThatApi(() -> person.unsubscribeOrganization(id)).fails(NOT_FOUND);
        assertThat(person.organizations(null, null, null, true, 0, 12).items()).isEmpty();
    }

    /**
     * ФЛОУ: посетитель находит клуб по названию, описанию, городу и спорту, затем открывает свои клубы.
     * ШАГИ: 1. Создать два допущенных клуба и один PENDING с уникальным общим названием.
     * 2. Подписаться на первый, посетить встречу второго (перенести занятие в прошлое через репозиторий).
     * 3. Проверить комбинации фильтров, постраничность и сегмент «Мои».
     * ПРОВЕРЯЕМ: скрытая анкета не попадает в выдачу, поиск работает по описанию без учёта регистра,
     * подписанный и посещённый клубы имеют разные признаки, неверные page/size дают 400.
     * ПОЧЕМУ ВАЖНО: «Мои» должны сохранять посещённые клубы даже без подписки, а фильтры каталога — сочетаться.
     */
    @Test void catalogCombinesFiltersAndIncludesSubscribedAndAttendedClubs() {
        var prefix = TestApi.uniqueName("Каталог ");
        var city = TestApi.uniqueName("Город ");
        var admin = api.newAdmin();
        var first = api.newOrganization("catalogOne");
        var second = api.newOrganization("catalogTwo");
        var a = first.submitOrganization(OrganizationForm.valid().name(prefix + " А").with("city", city).sports("Шахматы"));
        var b = second.submitOrganization(OrganizationForm.valid().name(prefix + " Б").description(prefix + " описание").sports("Бег"));
        api.newOrganization("hiddenClub").submitOrganization(OrganizationForm.valid().name(prefix + " скрыт"));
        admin.approveOrganization(a.id()); admin.approveOrganization(b.id());
        var person = api.newUser("catalogVisitor");
        person.subscribeOrganization(a.id());
        var meeting = second.createEvent(EventForm.free());
        person.joinEvent(meeting.id());
        moveToPast(meeting.id(), 3);
        assertThat(person.organizations(prefix.toUpperCase(), null, null, false, 0, 1).totalElements()).isEqualTo(2);
        assertThat(person.organizations(prefix, null, null, false, 1, 1).items()).hasSize(1);
        assertThat(person.organizations(prefix, city, a.sports().getFirst().id(), false, 0, 12).items()).singleElement().satisfies(c -> assertThat(c.id()).isEqualTo(a.id()));
        assertThat(person.organizations(prefix, city, b.sports().getFirst().id(), false, 0, 12).items()).isEmpty();
        assertThat(person.organizations(prefix + " описание", null, null, false, 0, 12).items()).singleElement().satisfies(c -> assertThat(c.id()).isEqualTo(b.id()));
        var mine = person.organizations(prefix, null, null, true, 0, 12).items();
        assertThat(mine).hasSize(2);
        assertThat(mine).filteredOn(c -> c.id().equals(a.id())).singleElement().satisfies(c -> { assertThat(c.subscribed()).isTrue(); assertThat(c.attended()).isFalse(); });
        assertThat(mine).filteredOn(c -> c.id().equals(b.id())).singleElement().satisfies(c -> { assertThat(c.attended()).isTrue(); assertThat(c.subscribed()).isFalse(); });
        assertThatApi(() -> person.organizations(null, null, null, false, -1, 12)).fails(BAD_REQUEST);
        assertThatApi(() -> person.organizations(null, null, null, false, 0, 0)).fails(BAD_REQUEST);
        assertThatApi(() -> person.organizations(null, null, null, false, 0, 101)).fails(BAD_REQUEST);
    }

    /**
     * ФЛОУ: сводка клуба показывает реальную историю и возвращаемость без снятых занятий.
     * ШАГИ: 1. Одобрить клуб, создать три встречи, записать пять человек на первую и одного на вторую.
     * 2. Перенести две встречи в прошлое. 3. Прочитать сводку, снять вторую встречу и перечитать, загрузить обложки и фото альбома участника, проверить страницы архива и фото.
     * ПРОВЕРЯЕМ: две проведённые встречи, пять участников за год, 20% возвращаемости, 12 месяцев графика,
     * ближайшее расписание, четыре аватара вместо всех участников, суммарные фото из двух источников; после модерации встреча не учитывается.
     * ПОЧЕМУ ВАЖНО: цифры должны отражать посещения и модерацию, а малые выборки не давать ложный процент.
     */
    @Test void overviewCountsMeetingsParticipantsAndSchedule() {
        var admin = api.newAdmin();
        var club = api.newOrganization("statsClub");
        var id = club.submitOrganization(OrganizationForm.valid()).id(); admin.approveOrganization(id);
        var first = club.createEvent(EventForm.free());
        var second = club.createEvent(EventForm.free());
        var future = club.createEvent(EventForm.free());
        var png = java.util.Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=");
        club.addEventPhoto(first.id(), png);
        club.addEventPhoto(second.id(), png);
        var people = List.of(api.newUser("statA"), api.newUser("statB"), api.newUser("statC"), api.newUser("statD"), api.newUser("statE"));
        assertThat(people.getFirst().organizationOverview(id).returningShare()).isNull();
        people.forEach(p -> p.joinEvent(first.id())); people.getFirst().joinEvent(second.id());
        moveToPast(first.id(), 5); moveToPast(second.id(), 3);
        people.getFirst().addAlbumPhoto(first.id(), png);
        var view = people.getFirst().organizationOverview(id);
        assertThat(view.hostedMeetings()).isEqualTo(2);
        assertThat(view.yearParticipants()).isEqualTo(5);
        assertThat(view.returningShare()).isEqualTo(20);
        assertThat(view.photosCount()).isEqualTo(3);
        assertThat(view.photoMeetingsCount()).isEqualTo(2);
        assertThat(people.getFirst().organizationPhotos(id, 0, 2).items()).hasSize(2);
        assertThat(people.getFirst().organizationPhotos(id, 1, 2).items()).hasSize(1);
        assertThat(people.getFirst().organizationMeetings(id, first.sport().id(), 0, 1).totalElements()).isEqualTo(2);
        assertThat(people.getFirst().organizationMeetings(id, UUID.randomUUID(), 0, 4).items()).isEmpty();
        assertThatApi(() -> people.getFirst().organizationMeetings(id, null, -1, 4)).fails(BAD_REQUEST, "Номер страницы не может быть отрицательным");
        assertThatApi(() -> people.getFirst().organizationPhotos(id, 0, 101)).fails(BAD_REQUEST, "Размер страницы должен быть от 1 до 100");
        assertThat(view.months()).hasSize(12);
        assertThat(view.months().stream().mapToLong(m -> m.count()).sum()).isEqualTo(2);
        assertThat(view.schedule()).singleElement().satisfies(d -> assertThat(d.eventId()).isEqualTo(future.id()));
        assertThat(view.past().items()).filteredOn(m -> m.eventId().equals(first.id())).singleElement().satisfies(m -> {
            assertThat(m.attendeesCount()).isEqualTo(5); assertThat(m.attendees()).hasSize(4); assertThat(m.photosCount()).isEqualTo(2);
        });
        admin.unpublishEvent(second.id(), "Проверка статистики");
        var revised = people.getFirst().organizationOverview(id);
        assertThat(revised.photosCount()).isEqualTo(2);
        assertThat(revised.hostedMeetings()).isEqualTo(1); assertThat(revised.returningShare()).isZero();
    }

    private void moveToPast(UUID eventId, int days) {
        var occurrence = occurrences.findByEventIdOrderByStartAt(eventId).getFirst();
        occurrence.setStartAt(Instant.now().minus(days, ChronoUnit.DAYS));
        occurrence.setEndAt(occurrence.getStartAt().plus(1, ChronoUnit.HOURS));
        occurrences.saveAndFlush(occurrence);
        var event = events.findById(eventId).orElseThrow();
        event.setStartAt(occurrence.getStartAt());
        event.setEndAt(occurrence.getEndAt());
        events.saveAndFlush(event);
    }
}
