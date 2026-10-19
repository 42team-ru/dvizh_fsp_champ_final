package com.hackathon.app.e2e;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import com.hackathon.app.domain.dto.*;
import com.hackathon.app.domain.entity.NotificationReminder;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.e2e.support.*;
import com.hackathon.app.repository.*;
import com.hackathon.app.service.NotificationReminderService;
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
class NotificationReminderE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired EventRepository events;
    @Autowired NotificationTestDataRepository data;
    @Autowired RegistrationRepository registrations;
    @Autowired OccurrenceAttendanceRepository attendances;
    @Autowired NotificationReminderRepository reminders;
    @Autowired NotificationReminderService worker;
    TestApi api;
    @BeforeEach void setup() { api = new TestApi(mvc, json, users, passwords); }

    /**
     * ФЛОУ: два срока напоминают участнику и организатору, но не позднему и не отключившему помощника.
     * ШАГИ: 1. Создать событие и записать трёх пользователей; одному выключить helpers.reminders.
     * 2. Подготовить сроки за сутки и за час как наступившие, отделив раннее вступление от позднего по времени БД.
     * 3. Обработать каждый срок дважды.
     * ПРОВЕРЯЕМ: у раннего участника и автора ровно два напоминания, у отключившего и позднего — ни одного;
     * повторный запуск задания не дублирует уведомления.
     * ПОЧЕМУ ВАЖНО: обработчик переживает повторный запуск, а пользователь не получает два запоздалых напоминания при вступлении.
     */
    @Test void bothDeadlinesRespectMembershipAndReminderPreference() {
        var author = api.newUser("reminderAuthor"); var member = api.newUser("reminderMember");
        var muted = api.newUser("reminderMuted"); var late = api.newUser("reminderLate");
        var event = author.createEvent(EventForm.free().startsIn(Duration.ofDays(3)));
        member.joinEvent(event.id()); muted.joinEvent(event.id()); late.joinEvent(event.id());
        var prefs = muted.myPreferences();
        muted.saveMyPreferences(new SaveUserPreferencesRequest(prefs.level(), prefs.days(), prefs.daytime(), prefs.radiusKm(),
                new HelpersPreferences(false, prefs.helpers().nearby(), prefs.helpers().cheer())));
        makeEarly(event.id(), author.id(), member.id(), muted.id());
        var lateRegistration = registrations.findByEventIdAndUserId(event.id(), late.id()).orElseThrow();
        lateRegistration.setDecidedAt(Instant.now().plusSeconds(60)); registrations.saveAndFlush(lateRegistration);
        var jobs = active(event.id()); assertThat(jobs).hasSize(2);
        assertThat(jobs).extracting(NotificationReminder::getOffsetMinutes).containsExactlyInAnyOrder(1440, 60);
        for (var job : jobs) {
            job.setDueAt(Instant.now().minusSeconds(1)); reminders.saveAndFlush(job);
            worker.process(job.getId()); worker.process(job.getId());
        }
        assertThat(reminderCount(member)).isEqualTo(2); assertThat(reminderCount(author)).isEqualTo(2);
        assertThat(reminderCount(muted)).isZero(); assertThat(reminderCount(late)).isZero();
        var soon = author.createEvent(EventForm.free().startsIn(Duration.ofMinutes(20)));
        assertThat(active(soon.id())).isEmpty();
    }

    /**
     * ФЛОУ: изменение расписания и отмена отзывают старые задания, а просроченный обработчик не шлёт старое напоминание.
     * ШАГИ: 1. Создать событие с участником, перенести его; попытаться обработать старые задания.
     * 2. Сделать новый срок просроченным больше допустимых пяти минут. 3. Отменить занятие и обработать остаток.
     * ПРОВЕРЯЕМ: перенос завершает старое поколение заданий и создаёт новое; просроченный срок пропускается;
     * отменённое занятие не создаёт напоминаний, история изменений при этом сохраняется.
     * ПОЧЕМУ ВАЖНО: старое расписание не должно приглашать человека на уже отменённую встречу.
     */
    @Test void reschedulingCancellationAndDowntimeInvalidateOldReminders() {
        var author = api.newUser("invalidReminderAuthor"); var member = api.newUser("invalidReminderMember");
        var form = EventForm.free().startsIn(Duration.ofDays(3));
        var event = author.createEvent(form); member.joinEvent(event.id());
        var original = active(event.id());
        author.updateEvent(event.id(), form.startsIn(Duration.ofDays(4)));
        for (var job : original) {
            assertThat(reminders.findById(job.getId()).orElseThrow().getFinishedAt()).isNotNull(); worker.process(job.getId());
        }
        var replacement = active(event.id()); assertThat(replacement).hasSize(2);
        makeEarly(event.id(), author.id(), member.id());
        var overdue = replacement.getFirst(); overdue.setDueAt(Instant.now().minusSeconds(600)); reminders.saveAndFlush(overdue);
        worker.process(overdue.getId());
        var slot = author.occurrences(event.id()).getFirst();
        author.cancelOccurrence(event.id(), slot.id(), "Площадка закрылась");
        replacement.forEach(j -> worker.process(j.getId()));
        assertThat(reminderCount(member)).isZero(); assertThat(reminderCount(author)).isZero();
        assertThat(active(event.id())).isEmpty();
    }

    /**
     * ФЛОУ: напоминание серии приходит только отметившемуся, а выход из серии отзывает будущие сроки участника.
     * ШАГИ: 1. Создать серию, вступить двумя участниками, одному отметить дату. 2. Подготовить наступивший срок и обработать.
     * 3. Выйти из серии и обработать второй срок.
     * ПРОВЕРЯЕМ: вступление в серию без отметки не даёт напоминание, после выхода новые напоминания не приходят.
     * ПОЧЕМУ ВАЖНО: подписка на серию и обещание прийти в конкретный день имеют разные адресаты.
     */
    @Test void seriesRemindersRequireAttendanceAndStopAfterLeaving() {
        var author = api.newUser("seriesReminderAuthor"); var member = api.newUser("seriesReminderMember");
        var observer = api.newUser("seriesReminderObserver");
        var day = LocalDate.now(ZoneId.of("Asia/Krasnoyarsk")).plusDays(3);
        var schedule = new ScheduleRequest("Asia/Krasnoyarsk", day, day.plusDays(2),
                List.of(new ScheduleRuleRequest(day.atTime(18, 0), 60, "FREQ=DAILY;COUNT=1")));
        var event = author.createEvent(EventForm.free().schedule(schedule));
        member.joinEvent(event.id()); observer.joinEvent(event.id());
        var slot = author.occurrences(event.id()).getFirst(); member.attend(event.id(), slot.id());
        makeEarly(event.id(), author.id(), member.id());
        var attendance = attendances.findByOccurrenceIdAndUserId(slot.id(), member.id()).orElseThrow();
        data.attendanceCreatedAt(attendance.getId(), Instant.now().minus(2, ChronoUnit.DAYS));
        var jobs = active(event.id()); var first = jobs.getFirst();
        first.setDueAt(Instant.now().minusSeconds(1)); reminders.saveAndFlush(first); worker.process(first.getId());
        assertThat(reminderCount(member)).isEqualTo(1); assertThat(reminderCount(observer)).isZero();
        member.cancelRegistration(event.id());
        var second = jobs.getLast(); second.setDueAt(Instant.now().minusSeconds(1)); reminders.saveAndFlush(second); worker.process(second.getId());
        assertThat(reminderCount(member)).isEqualTo(1);
    }

    private List<NotificationReminder> active(UUID eventId) { return reminders.findByEventIdAndFinishedAtIsNull(eventId); }
    private long reminderCount(Actor actor) { return actor.notifications().items().stream().filter(n -> n.type() == NotificationType.REMINDER).count(); }
    private void makeEarly(UUID eventId, UUID... ids) {
        data.eventCreatedAt(eventId, Instant.now().minus(2, ChronoUnit.DAYS));
        for (var id : ids) registrations.findByEventIdAndUserId(eventId, id).ifPresent(r -> {
            r.setDecidedAt(Instant.now().minus(2, ChronoUnit.DAYS)); registrations.saveAndFlush(r);
        });
    }
}
