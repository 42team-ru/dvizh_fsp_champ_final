package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import java.time.*;
import java.util.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.domain.dto.*;
import com.hackathon.app.e2e.support.*;
import com.hackathon.app.repository.*;
import com.hackathon.app.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class NotificationInboxE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired NotificationLongPolling polling;
    @Autowired NotificationRepository notifications;
    @Autowired NotificationTestDataRepository data;
    @Autowired NotificationDeliveryRepository deliveries;
    @Autowired NotificationMaintenance maintenance;
    @Autowired RegistrationService registrations;
    @Autowired CommentService comments;
    @Autowired PlatformTransactionManager transactions;
    TestApi api;
    @BeforeEach void setup() { api = new TestApi(mvc, json, users, passwords); }

    /**
     * ФЛОУ: колокольчик двух вкладок обновляется при новых сообщениях и прочтении без потери свежего уведомления.
     * ШАГИ: 1. Открыть long poll, записать первого участника, дождаться сигнала. 2. Записать второго и прочитать старый снимок.
     * 3. Открыть два ожидания, прочитать оставшееся сообщение; отдельно завершить ожидание по timeout.
     * ПРОВЕРЯЕМ: новая запись будит ожидание, read-all не читает более свежие сообщения, обе вкладки видят прочтение;
     * timeout возвращает changed=false, гость получает 401, повторное прочтение не меняет ревизию.
     * ПОЧЕМУ ВАЖНО: вкладки не расходятся по счётчику, а гонка нового сообщения с read-all не прячет непрочитанное.
     */
    @Test void longPollingAndReadingSynchronizeTabs() {
        var author = api.newUser("inboxAuthor");
        var first = api.newUser("inboxFirst"); var second = api.newUser("inboxSecond");
        var event = author.createEvent(EventForm.free());
        var pending = author.beginNotificationPoll(0, 25);
        first.joinEvent(event.id()); polling.tick();
        var wake = pending.await();
        assertThat(wake.changed()).isTrue(); assertThat(wake.unreadCount()).isEqualTo(1);
        second.joinEvent(event.id());
        var after = author.readNotifications(wake.revision());
        assertThat(after.unreadCount()).isEqualTo(1);
        var tabOne = author.beginNotificationPoll(after.revision(), 25);
        var tabTwo = author.beginNotificationPoll(after.revision(), 25);
        var latest = author.notifications().items().getFirst();
        var read = author.readNotification(latest.id()); polling.tick();
        assertThat(tabOne.await().unreadCount()).isZero();
        assertThat(tabTwo.await().revision()).isEqualTo(read.revision());
        var repeated = author.readNotification(latest.id());
        assertThat(repeated.revision()).isEqualTo(read.revision()); assertThat(repeated.changed()).isFalse();
        var timeout = author.beginNotificationPoll(read.revision(), 25).timeout();
        assertThat(timeout.changed()).isFalse();
        assertThat(author.notificationPoll(0, 0).changed()).isTrue();
        assertThatApi(() -> api.guest().notifications()).fails(UNAUTHORIZED);
    }

    /**
     * ФЛОУ: пользователь листает историю, отключает внешнюю категорию и переживает очистку старых сообщений.
     * ШАГИ: 1. Создать три ответа, запросить две страницы и прочитать одно сообщение. 2. Отключить категории и ответить снова.
     * 3. Сделать одно сообщение старше 30 дней, очистить историю и проверить ревизию.
     * ПРОВЕРЯЕМ: курсор не повторяет записи, unreadOnly и счётчик согласованы, внутренние уведомления сохраняются всегда;
     * очистка удаляет связанные доставки и будит клиента увеличением ревизии.
     * ПОЧЕМУ ВАЖНО: настройки внешних каналов не уничтожают внутреннюю историю, а очистка не ломает колокольчик.
     */
    @Test void cursorPreferencesAndRetentionPreserveInboxSemantics() {
        var author = api.newUser("cursorAuthor"); var member = api.newUser("cursorMember");
        var event = author.createEvent(EventForm.free()); var question = member.comment(event.id(), "Вопрос");
        member.connectEmail("member@example.com"); member.connectMax("+79991234567");
        member.notificationSettings(Set.of(NotificationChannel.MAX, NotificationChannel.EMAIL), EnumSet.allOf(NotificationCategory.class));
        for (int i = 0; i < 3; i++) author.reply(event.id(), question.id(), "Ответ " + i);
        var first = member.notifications(Map.of("size", "2"));
        var second = member.notifications(Map.of("size", "2", "cursor", first.nextCursor()));
        assertThat(first.items()).hasSize(2); assertThat(second.items()).hasSize(1);
        assertThat(second.items()).doesNotContainAnyElementsOf(first.items()); assertThat(second.nextCursor()).isNull();
        member.readNotification(first.items().getFirst().id());
        assertThat(member.notifications(Map.of("unreadOnly", "true")).items()).hasSize(2);
        member.notificationSettings(Set.of(NotificationChannel.MAX), Set.of());
        author.reply(event.id(), question.id(), "Ещё ответ");
        assertThat(member.notifications().items()).hasSize(4);
        var old = notifications.findById(second.items().getFirst().id()).orElseThrow();
        data.notificationCreatedAt(old.getId(), Instant.now().minus(31, java.time.temporal.ChronoUnit.DAYS));
        long revision = member.notifications().revision();
        maintenance.cleanUser(member.id());
        assertThat(member.notifications().items()).hasSize(3);
        assertThat(member.notificationPoll(revision, 0).changed()).isTrue();
        assertThat(deliveries.findByNotificationIdIn(List.of(old.getId()))).isEmpty();
    }

    /**
     * ФЛОУ: неуспешная предметная транзакция не оставляет уведомление и задачу отправки.
     * ШАГИ: 1. Создать автора, участника и свободное событие. 2. Выполнить запись в транзакции и принудительно откатить её.
     * 3. Повторить запись обычным API.
     * ПРОВЕРЯЕМ: после rollback у автора пусто; успешная запись создаёт ровно одно уведомление о записи и две mock-доставки.
     * ПОЧЕМУ ВАЖНО: пользователь не должен получать сообщения о действии, которое не сохранилось в БД.
     */
    @Test void rollbackDoesNotLeakNotificationsOrOutboxTasks() {
        var author = api.newUser("rollbackNotifyAuthor"); var member = api.newUser("rollbackNotifyMember");
        author.connectEmail("author@example.com"); author.connectMax("+79991234567");
        author.notificationSettings(Set.of(NotificationChannel.MAX, NotificationChannel.EMAIL), EnumSet.allOf(NotificationCategory.class));
        var event = author.createEvent(EventForm.free());
        assertThatThrownBy(() -> new TransactionTemplate(transactions).execute(status -> {
            registrations.create(event.id(), member.id(), null);
            throw new IllegalStateException("rollback");
        })).isInstanceOf(IllegalStateException.class).hasMessage("rollback");
        assertThat(author.notifications().items()).isEmpty();
        member.connectMax("+79991234567");
        member.notificationSettings(Set.of(NotificationChannel.MAX), EnumSet.allOf(NotificationCategory.class));
        var question = member.comment(event.id(), "Вопрос до отката");
        assertThatThrownBy(() -> new TransactionTemplate(transactions).execute(status -> {
            comments.create(event.id(), author.id(), "Ответ с откатом", question.id());
            throw new IllegalStateException("rollback");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(member.notifications().items()).isEmpty();
        assertThat(deliveries.findByUserIdAndStatusIn(member.id(), EnumSet.allOf(NotificationDeliveryStatus.class))).isEmpty();
        member.joinEvent(event.id());
        // у автора ещё уведомление о вопросе участника — проверяем только запись
        var saved = author.notifications().items().stream()
                .filter(n -> n.type() == NotificationType.REGISTRATION_CREATED).toList();
        assertThat(saved).hasSize(1);
        assertThat(deliveries.findByNotificationIdIn(List.of(saved.getFirst().id()))).hasSize(2);
    }
}
