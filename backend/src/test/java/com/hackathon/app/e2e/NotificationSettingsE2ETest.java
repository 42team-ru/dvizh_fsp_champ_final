package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;
import java.util.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.domain.dto.NotificationSettingsResponse;
import com.hackathon.app.e2e.support.*;
import com.hackathon.app.repository.*;
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
class NotificationSettingsE2ETest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired NotificationDeliveryRepository deliveries;
    TestApi api;
    @BeforeEach void setup() { api = new TestApi(mvc, json, users, passwords); }

    /**
     * ФЛОУ: пользователь подключает внешние демо-каналы, выбирает категории и затем отключает их.
     * ШАГИ: 1. Подключить почту и MAX с форматированным телефоном. 2. Сохранить каналы и категорию обсуждений,
     * получить ответ организатора. 3. Отключить почту и MAX, перечитать настройки и очередь.
     * ПРОВЕРЯЕМ: connected, target, MOCK, нормализацию 8 в +7, сохранение категорий, приватность адресов;
     * отключение очищает адресата и канал, отменяет ожидающие доставки, сохраняет внутреннее уведомление.
     * ПОЧЕМУ ВАЖНО: экран показывает реальное состояние привязки, отключённый канал больше не получает сообщения.
     */
    @Test void connectConfigureAndDisconnectChannels() {
        var member = api.newUser("settingsMember"); var author = api.newUser("settingsAuthor");
        assertThat(member.notificationSettings().availableChannels()).allMatch(c -> !c.connected() && c.target() == null);
        var email = member.connectEmail("member@example.com");
        assertThat(channel(email, NotificationChannel.EMAIL)).satisfies(c -> {
            assertThat(c.connected()).isTrue(); assertThat(c.target()).isEqualTo("member@example.com");
            assertThat(c.mode()).isEqualTo("MOCK");
        });
        member.connectMax("8 (999) 123-45-67");
        member.notificationSettings(Set.of(NotificationChannel.EMAIL, NotificationChannel.MAX), Set.of(NotificationCategory.DISCUSSIONS));
        var saved = member.notificationSettings();
        assertThat(saved.channels()).containsExactlyInAnyOrder(NotificationChannel.EMAIL, NotificationChannel.MAX);
        assertThat(saved.categories()).containsExactly(NotificationCategory.DISCUSSIONS);
        assertThat(channel(saved, NotificationChannel.MAX).target()).isEqualTo("+79991234567");
        assertThat(author.notificationSettings().channels()).isEmpty();
        var event = author.createEvent(EventForm.free());
        var question = member.comment(event.id(), "Как найти вход?"); author.reply(event.id(), question.id(), "У ворот");
        var notification = member.notifications().items().getFirst();
        assertThat(deliveries.findByNotificationIdIn(List.of(notification.id()))).hasSize(2);
        member.disconnectEmail(); member.disconnectMax(); member.disconnectEmail();
        var disconnected = member.notificationSettings();
        assertThat(disconnected.channels()).isEmpty();
        assertThat(disconnected.availableChannels()).allMatch(c -> !c.connected() && c.target() == null);
        assertThat(disconnected.categories()).containsExactly(NotificationCategory.DISCUSSIONS);
        assertThat(deliveries.findByNotificationIdIn(List.of(notification.id())))
                .allMatch(d -> d.getStatus() == NotificationDeliveryStatus.SKIPPED);
        assertThat(member.notifications().items()).hasSize(1);
    }

    /**
     * ФЛОУ: неподключённые каналы нельзя включить, ошибочные контакты нельзя сохранить, гость не меняет настройки.
     * ШАГИ: 1. Попробовать включить EMAIL и MAX без привязки. 2. Передать неверные, пустые и слишком длинные контакты.
     * 3. Подключить корректные контакты и проверить отказ гостю.
     * ПРОВЕРЯЕМ: 409 с подсказками, 400 с русским detail, отсутствие частично сохранённых настроек и 401 для гостя.
     * ПОЧЕМУ ВАЖНО: не возникает подписок без адресата, а ошибки объясняют человеку, что исправить.
     */
    @Test void invalidContactsAndUnconnectedChannelsAreRejected() {
        var user = api.newUser("settingsInvalid");
        assertThatApi(() -> user.notificationSettings(Set.of(NotificationChannel.EMAIL), Set.of()))
                .fails(CONFLICT, "Сначала укажите почту");
        assertThatApi(() -> user.notificationSettings(Set.of(NotificationChannel.MAX), Set.of()))
                .fails(CONFLICT, "Сначала укажите номер MAX");
        for (var email : List.of("wrong", "", "a".repeat(250) + "@test.ru"))
            assertThatApi(() -> user.connectEmail(email)).fails(BAD_REQUEST, "Неверный адрес почты");
        for (var phone : List.of("+19991234567", "", "+7999abc4567", "+799912345678"))
            assertThatApi(() -> user.connectMax(phone)).fails(BAD_REQUEST, "Неверный номер телефона");
        assertThat(user.notificationSettings().channels()).isEmpty();
        user.connectEmail("valid@example.com"); user.connectMax("+7 (999) 123-45-67");
        assertThatApi(() -> api.guest().connectEmail("guest@example.com")).fails(UNAUTHORIZED);
        assertThatApi(() -> api.guest().disconnectMax()).fails(UNAUTHORIZED);
    }

    private static NotificationSettingsResponse.Channel channel(NotificationSettingsResponse settings, NotificationChannel channel) {
        return settings.availableChannels().stream().filter(c -> c.channel() == channel).findFirst().orElseThrow();
    }
}
