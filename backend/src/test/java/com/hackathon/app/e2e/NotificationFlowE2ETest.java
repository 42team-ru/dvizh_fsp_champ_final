package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import java.time.*;
import java.util.*;
import com.hackathon.app.domain.dto.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.e2e.support.*;
import com.hackathon.app.repository.AppUserRepository;
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
class NotificationFlowE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    TestApi api;
    @BeforeEach void setup() { api = new TestApi(mvc, json, users, passwords); }

    /**
     * ФЛОУ: заявка, решение, правки карточки и модерация доходят до нужных участников.
     * ШАГИ: 1. Создать событие REQUEST, добавить соорганизатора, принять одного участника и оставить второго PENDING.
     * 2. Повторить сохранение без изменений, затем изменить описание и фото. 3. Снять событие с публикации и удалить.
     * ПРОВЕРЯЕМ: организаторы получают заявки, участник — решение; PENDING получает общие изменения;
     * нет уведомлений о собственных действиях и повторных командах, приватные ссылки и детали не копируются.
     * ПОЧЕМУ ВАЖНО: участник узнаёт об изменении договорённостей, а ожидающий не получает закрытые сведения.
     */
    @Test void registrationsCardPhotosAndModerationReachTheirAudience() {
        var author = api.newUser("notifyAuthor");
        var co = api.newUser("notifyCo");
        var member = api.newUser("notifyMember");
        var pending = api.newUser("notifyPending");
        var admin = api.newAdmin();
        var form = EventForm.byRequest().online("https://private.example/meeting").privateDetails("Секретный код 9182");
        var event = author.createEvent(form);
        author.addOrganizer(event.id(), co.username());
        assertThat(types(co)).containsExactly(NotificationType.ORGANIZER_ADDED);
        var registration = member.joinEvent(event.id());
        assertThat(types(author)).containsExactly(NotificationType.REGISTRATION_CREATED);
        assertThat(member.notifications().items()).isEmpty();
        author.approve(registration.id());
        author.approve(registration.id());
        assertThat(types(member)).containsExactly(NotificationType.REGISTRATION_APPROVED);
        pending.joinEvent(event.id());
        author.updateEvent(event.id(), form);
        assertThat(pending.notifications().items()).isEmpty();
        author.updateEvent(event.id(), form.description("Изменённое описание"));
        assertThat(types(pending)).containsExactly(NotificationType.EVENT_CHANGED);
        var png = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=");
        var photoEvent = author.addEventPhoto(event.id(), png);
        assertThat(types(member)).containsExactly(NotificationType.EVENT_CHANGED, NotificationType.EVENT_CHANGED, NotificationType.REGISTRATION_APPROVED);
        author.removeEventPhoto(event.id(), photoEvent.photos().getFirst().id());
        admin.unpublishEvent(event.id(), "Площадка закрыта");
        long before = pending.notifications().revision();
        admin.unpublishEvent(event.id(), "Площадка закрыта");
        assertThat(pending.notifications().revision()).isEqualTo(before);
        admin.deleteEvent(event.id(), "Отменено окончательно");
        assertThat(types(pending)).contains(NotificationType.EVENT_UNPUBLISHED, NotificationType.EVENT_DELETED);
        assertThat(member.notifications().items()).allSatisfy(n -> {
            assertThat(n.body()).doesNotContain("Секретный", "9182", "private.example");
            assertThat(n.targetPath()).isEqualTo("/events/" + event.id());
        });
        assertThat(types(admin)).isEmpty();
        assertThatApi(() -> pending.readNotification(member.notifications().items().getFirst().id()))
                .fails(NOT_FOUND, "Уведомление не найдено");
    }

    /**
     * ФЛОУ: участники серии получают уведомления только о выбранной дате, а кворум отражает правила карточки.
     * ШАГИ: 1. Вступить втроём в серию, двоим отметить первую дату. 2. Набрать и потерять кворум, вручную подтвердить.
     * 3. Перенести и отменить занятие; изменить общее расписание с отменой другой отмеченной даты.
     * ПРОВЕРЯЕМ: непришедший участник не получает сообщения о дате, ручное подтверждение подавляет колебания кворума;
     * пересчёт расписания даёт одно общее уведомление вместо дубля с автоматической отменой.
     * ПОЧЕМУ ВАЖНО: серия не превращается в рассылку обо всех датах, но выбранное занятие нельзя пропустить при переносе.
     */
    @Test void seriesDatesAndQuorumUseActualAttendance() {
        var author = api.newUser("seriesNotifyAuthor");
        var first = api.newUser("seriesNotifyFirst");
        var second = api.newUser("seriesNotifySecond");
        var observer = api.newUser("seriesNotifyObserver");
        var day = LocalDate.now(ZoneId.of("Asia/Krasnoyarsk")).plusDays(2);
        var schedule = new ScheduleRequest("Asia/Krasnoyarsk", day, day.plusDays(6),
                List.of(new ScheduleRuleRequest(day.atTime(18, 0), 60, "FREQ=DAILY;COUNT=3")));
        var form = EventForm.free().schedule(schedule).minParticipants(2).capacity(3);
        var event = author.createEvent(form);
        first.joinEvent(event.id()); second.joinEvent(event.id()); observer.joinEvent(event.id());
        var slots = author.occurrences(event.id());
        var slot = slots.getFirst();
        first.attend(event.id(), slot.id()); second.attend(event.id(), slot.id());
        assertThat(types(first)).containsExactly(NotificationType.QUORUM_REACHED);
        assertThat(types(observer)).isEmpty();
        first.unattend(event.id(), slot.id());
        assertThat(types(second)).containsExactly(NotificationType.QUORUM_LOST);
        author.confirmOccurrence(event.id(), slot.id());
        second.unattend(event.id(), slot.id()); first.attend(event.id(), slot.id());
        assertThat(types(first)).containsExactly(NotificationType.QUORUM_REACHED);
        var newStart = slot.startAt().plusSeconds(900);
        author.rescheduleOccurrence(event.id(), slot.id(), newStart);
        assertThat(types(first)).contains(NotificationType.OCCURRENCE_RESCHEDULED);
        assertThat(first.notifications().items().getFirst().body()).contains("Было:", "Стало:");
        author.cancelOccurrence(event.id(), slot.id(), "Зал закрыт");
        assertThat(types(first)).contains(NotificationType.OCCURRENCE_CANCELLED);
        assertThat(types(observer)).isEmpty();
        first.attend(event.id(), slots.get(1).id());
        long previous = first.notifications().revision();
        var replacement = new ScheduleRequest(schedule.timeZone(), day, day.plusDays(6),
                List.of(new ScheduleRuleRequest(day.plusDays(2).atTime(18, 0), 60, "FREQ=DAILY;COUNT=2")));
        author.updateEvent(event.id(), form.schedule(replacement));
        assertThat(first.notifications().revision()).isEqualTo(previous + 1);
        assertThat(first.notifications().items().getFirst().type()).isEqualTo(NotificationType.EVENT_CHANGED);
        assertThat(first.notifications().items().getFirst().body()).contains("отменено");
        assertThat(types(observer)).containsExactly(NotificationType.EVENT_CHANGED);
    }

    /**
     * ФЛОУ: решения по организации, прямые ответы и изменения соорганизаторов доставляются адресно.
     * ШАГИ: 1. Подать анкету, одобрить, отклонить и подать снова. 2. Написать вопрос и прямой ответ, затем ответить себе.
     * 3. Добавить соорганизатора и выйти из состава самостоятельно.
     * ПРОВЕРЯЕМ: все активные админы видят подачу, организация — решения; повторный отказ без изменений не дублируется;
     * уведомления обсуждения получает только автор исходного сообщения, самостоятельный выход получает автор события.
     * ПОЧЕМУ ВАЖНО: новые процессы используют общий механизм, не рассылая весь чат всем участникам.
     */
    @Test void organizationsRepliesAndOrganizersAreAddressed() {
        var admin = api.newAdmin(); var otherAdmin = api.newAdmin();
        var org = api.newOrganization("notifyOrg");
        var form = OrganizationForm.valid();
        var organization = org.submitOrganization(form);
        assertThat(types(admin)).contains(NotificationType.ORGANIZATION_SUBMITTED);
        assertThat(types(otherAdmin)).contains(NotificationType.ORGANIZATION_SUBMITTED);
        admin.approveOrganization(organization.id()); admin.approveOrganization(organization.id());
        admin.rejectOrganization(organization.id(), "Нужен документ");
        long revision = org.notifications().revision();
        admin.rejectOrganization(organization.id(), "Нужен документ");
        assertThat(org.notifications().revision()).isEqualTo(revision);
        assertThat(types(org)).containsExactly(NotificationType.ORGANIZATION_REJECTED, NotificationType.ORGANIZATION_APPROVED);
        org.submitOrganization(form.description("Добавлено описание"));
        assertThat(types(otherAdmin).stream().filter(t -> t == NotificationType.ORGANIZATION_SUBMITTED)).hasSize(2);
        var author = api.newUser("replyNotifyAuthor"); var commenter = api.newUser("replyNotifyUser"); var co = api.newUser("replyNotifyCo");
        var event = author.createEvent(EventForm.free());
        var question = commenter.comment(event.id(), "Где встречаемся?");
        author.comment(event.id(), "Обычное сообщение");
        author.reply(event.id(), question.id(), "Ответ с подробностями");
        commenter.reply(event.id(), question.id(), "Сам себе");
        assertThat(types(commenter)).containsExactly(NotificationType.COMMENT_REPLY);
        assertThat(types(author)).isEmpty();
        author.addOrganizer(event.id(), co.username()); co.removeOrganizer(event.id(), co.id());
        assertThat(types(co)).containsExactly(NotificationType.ORGANIZER_ADDED);
        assertThat(types(author)).containsExactly(NotificationType.ORGANIZER_REMOVED);
    }

    private List<NotificationType> types(Actor actor) { return actor.notifications().items().stream().map(NotificationResponse::type).toList(); }
}
