package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicLong;
import com.sun.net.httpserver.HttpServer;
import com.hackathon.app.domain.dto.*;
import com.hackathon.app.domain.entity.NotificationDelivery;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.e2e.support.*;
import com.hackathon.app.repository.*;
import com.hackathon.app.service.*;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"app.notifications.telegram.enabled=true", "app.notifications.telegram.token=test-token",
        "app.notifications.telegram.username=local_test_bot", "app.notifications.telegram.webhook-secret=local-test-secret",
        "app.notifications.public-url=https://sport.example"})
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class NotificationTelegramE2ETest {
    static final AtomicLong updates = new AtomicLong(1000);
    static final AtomicLong chats = new AtomicLong(10000);
    static final Queue<Integer> statuses = new ConcurrentLinkedQueue<>();
    static final Queue<String> requests = new ConcurrentLinkedQueue<>();
    static final HttpServer server = startServer();
    static HttpServer startServer() {
        try {
            var http = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            // Любой метод бота: уведомление о мероприятии уходит через sendPhoto, ответы на команды — sendMessage.
            http.createContext("/bottest-token/", exchange -> {
                requests.add(exchange.getRequestURI().getPath() + "\n"
                        + new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                Integer next = statuses.poll(); int code = next == null ? 200 : next;
                if (code == 0) { exchange.close(); return; }
                String body = code == 200 ? "{\"ok\":true,\"result\":{\"message_id\":42}}"
                        : "{\"ok\":false,\"error_code\":" + code + ",\"description\":\"provider-private-token\",\"parameters\":{\"retry_after\":600}}";
                var bytes = body.getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(code, bytes.length); exchange.getResponseBody().write(bytes); exchange.close();
            }); http.start(); return http;
        } catch (java.io.IOException failure) { throw new IllegalStateException(failure); }
    }
    @DynamicPropertySource static void telegramUrl(DynamicPropertyRegistry registry) {
        registry.add("app.notifications.telegram.api-url", () -> "http://127.0.0.1:" + server.getAddress().getPort());
    }
    @AfterAll static void stopServer() { server.stop(0); }
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AppUserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired TelegramLinkTokenRepository tokens;
    @Autowired TelegramUpdateReceiptRepository receipts;
    @Autowired NotificationDeliveryRepository deliveries;
    @Autowired TelegramRateLimitRepository rates;
    @Autowired NotificationDeliveryService queue;
    @Autowired NotificationJobs worker;
    TestApi api;
    @BeforeEach void setup() { api = new TestApi(mvc, json, users, passwords); statuses.clear(); requests.clear(); }

    /**
     * ФЛОУ: пользователь подключает Telegram и получает одно сообщение, а MAX/email завершаются явной имитацией.
     * ШАГИ: 1. Получить одноразовую ссылку, запустить бота, включить три канала. 2. Подать заявку и получить одобрение.
     * 3. Обработать три задания настоящим Telegram HTTP-клиентом и двумя адаптерами-заглушками.
     * ПРОВЕРЯЕМ: подключение включает Telegram; outbox имеет результаты SENT/MOCKED/MOCKED, отправлен только один HTTP-запрос;
     * сообщение содержит ссылку на конкретное мероприятие, но не приватные детали или ссылку встречи.
     * ПОЧЕМУ ВАЖНО: настоящая интеграция и заглушки используют один путь, а пользователю понятно, куда перейти из сообщения.
     */
    @Test void connectedTelegramAndMockChannelsUseTheSameOutbox() {
        var author = api.newUser("telegramAuthor"); var member = api.newUser("telegramMember");
        member.connectEmail("member@example.com"); member.connectMax("+79991234567");
        long chat = connect(member);
        assertThat(member.telegramConnection().connected()).isTrue();
        assertThat(member.notificationSettings().channels()).contains(NotificationChannel.TELEGRAM);
        member.notificationSettings(EnumSet.allOf(NotificationChannel.class), EnumSet.allOf(NotificationCategory.class));
        var event = author.createEvent(EventForm.byRequest().online("https://private.example/join").privateDetails("Закрытый код"));
        var registration = member.joinEvent(event.id()); author.approve(registration.id());
        var notification = member.notifications().items().getFirst();
        var tasks = deliveries.findByNotificationIdIn(List.of(notification.id())); assertThat(tasks).hasSize(3);
        for (var task : tasks) { releaseLimits(); worker.deliverOne(task.getId()); }
        assertThat(deliveries.findByNotificationIdIn(List.of(notification.id()))).extracting(NotificationDelivery::getStatus)
                .containsExactlyInAnyOrder(NotificationDeliveryStatus.SENT, NotificationDeliveryStatus.MOCKED, NotificationDeliveryStatus.MOCKED);
        assertThat(requests).hasSize(1);
        assertThat(requests.peek()).contains("https://sport.example/events/" + event.id(), Long.toString(chat))
                .doesNotContain("private.example", "Закрытый код");
        author.reply(event.id(), member.comment(event.id(), "Вопрос").id(), "Ответ");
        var unsent = member.notifications().items().getFirst();
        member.notificationSettings(Set.of(), EnumSet.allOf(NotificationCategory.class));
        member.notificationSettings(EnumSet.allOf(NotificationChannel.class), EnumSet.allOf(NotificationCategory.class));
        for (var task : deliveries.findByNotificationIdIn(List.of(unsent.id()))) worker.deliverOne(task.getId());
        assertThat(deliveries.findByNotificationIdIn(List.of(unsent.id()))).allSatisfy(d -> assertThat(d.getStatus()).isEqualTo(NotificationDeliveryStatus.SKIPPED));
        assertThat(requests).hasSize(1);
    }

    /**
     * ФЛОУ: привязка не принимает старые ссылки, группы и чужой секрет; перенос Telegram требует отключения.
     * ШАГИ: 1. Выдать две ссылки и предъявить старую, просрочить новую, проверить чужой секрет и групповой чат.
     * 2. Подключиться свежей ссылкой, повторить update и попробовать связать тот же Telegram с другим аккаунтом.
     * 3. Отправить /stop, затем подключить второй аккаунт.
     * ПРОВЕРЯЕМ: отклонённые ссылки не меняют привязку; update обрабатывается один раз; чужая привязка не переносится;
     * /stop освобождает Telegram. Просроченный пользовательский cookie не мешает webhook с правильным секретом.
     * ПОЧЕМУ ВАЖНО: подключение канала не должно позволять повторное использование ссылки или незаметный захват привязки.
     */
    @Test void linksWebhookDeduplicationAndDisconnectProtectAccountBinding() {
        var member = api.newUser("telegramLinkOwner"); var other = api.newUser("telegramLinkOther");
        long chat = chats.incrementAndGet();
        var old = member.telegramLink(); var fresh = member.telegramLink();
        var rejected = update(chat, "/start " + token(old));
        assertThatApi(() -> api.guest().telegramUpdate("wrong", rejected)).fails(FORBIDDEN, "Неверный секрет webhook");
        api.guest().telegramUpdate("local-test-secret", rejected);
        assertThat(member.telegramConnection().connected()).isFalse();
        var stored = tokens.findByUserIdAndUsedAtIsNull(member.id()).getFirst();
        stored.setExpiresAt(Instant.now().minusSeconds(1)); tokens.saveAndFlush(stored);
        api.guest().telegramUpdate("local-test-secret", update(chat, "/start " + token(fresh)));
        assertThat(member.telegramConnection().connected()).isFalse();
        var valid = member.telegramLink();
        var grouped = new TelegramUpdateRequest(updates.incrementAndGet(), new TelegramUpdateRequest.Message(
                new TelegramUpdateRequest.User(chat, "person"), new TelegramUpdateRequest.Chat(-chat, "group"), "/start " + token(valid)), null);
        api.guest().telegramUpdate("local-test-secret", grouped);
        assertThat(member.telegramConnection().connected()).isFalse();
        var accepted = update(chat, "/start " + token(valid));
        api.withAccessToken(new Cookie("access_token", "expired.invalid.token")).telegramUpdate("local-test-secret", accepted);
        api.guest().telegramUpdate("local-test-secret", accepted);
        assertThat(receipts.existsByUpdateId(accepted.updateId())).isTrue();
        assertThat(deliveries.findAll().stream().filter(d -> d.getDedupKey().equals("telegram-command:" + accepted.updateId()))).hasSize(1);
        assertThat(member.telegramConnection().connected()).isTrue();
        var otherLink = other.telegramLink();
        api.guest().telegramUpdate("local-test-secret", update(chat, "/start " + token(otherLink)));
        assertThat(other.telegramConnection().connected()).isFalse();
        api.guest().telegramUpdate("local-test-secret", update(chat, "/stop"));
        assertThat(member.telegramConnection().connected()).isFalse();
        api.guest().telegramUpdate("local-test-secret", update(chat, "/start " + token(otherLink)));
        assertThat(other.telegramConnection().connected()).isTrue();
    }

    /**
     * ФЛОУ: очередь переживает перезапуск обработчика, ограничения Telegram и блокировку бота.
     * ШАГИ: 1. Зарезервировать сообщение и проверить ограничение второго сообщения в тот же чат.
     * 2. Просрочить lease, получить 429 и 5xx, затем успешно отправить; предъявить старый fencing token.
     * 3. Получить 403 на новом сообщении.
     * ПРОВЕРЯЕМ: одновременно действителен один lease, retry_after соблюдается, старый обработчик не перезаписывает результат;
     * 403 отключает привязку, диагностика не содержит тело провайдера и секреты.
     * ПОЧЕМУ ВАЖНО: сбой процесса не теряет задачу, а ошибки внешнего API не ломают предметные действия.
     */
    @Test void retriesLeasesRateLimitsAndBlockedBotAreHandled() {
        var author = api.newUser("telegramRetryAuthor"); var member = api.newUser("telegramRetryMember"); connect(member);
        var event = author.createEvent(EventForm.free()); var question = member.comment(event.id(), "Вопрос");
        author.reply(event.id(), question.id(), "Первый"); author.reply(event.id(), question.id(), "Второй");
        var first = telegramTask(member.notifications().items().getLast().id());
        var second = telegramTask(member.notifications().items().getFirst().id());
        releaseLimits(); var oldClaim = queue.claim(first.getId()); assertThat(oldClaim).isNotNull();
        assertThat(queue.claim(first.getId())).isNull(); assertThat(queue.claim(second.getId())).isNull();
        var secondState = deliveries.findById(second.getId()).orElseThrow();
        assertThat(secondState.getAttempts()).isZero(); assertThat(secondState.getNextAttemptAt()).isAfter(Instant.now());
        var stale = deliveries.findById(first.getId()).orElseThrow(); stale.setLeaseUntil(Instant.now().minusSeconds(1)); deliveries.saveAndFlush(stale);
        releaseLimits(); statuses.add(429); worker.deliverOne(first.getId());
        var retried = deliveries.findById(first.getId()).orElseThrow();
        assertThat(retried.getStatus()).isEqualTo(NotificationDeliveryStatus.PENDING);
        assertThat(retried.getNextAttemptAt()).isAfter(Instant.now().plusSeconds(590));
        assertThat(retried.getLastError()).doesNotContain("provider-private-token", "test-token");
        queue.complete(oldClaim, new NotificationTransport.Result(NotificationDeliveryStatus.SENT, 1L));
        assertThat(deliveries.findById(first.getId()).orElseThrow().getStatus()).isEqualTo(NotificationDeliveryStatus.PENDING);
        makeDue(first.getId()); statuses.add(500); worker.deliverOne(first.getId());
        assertThat(deliveries.findById(first.getId()).orElseThrow().getStatus()).isEqualTo(NotificationDeliveryStatus.PENDING);
        makeDue(first.getId()); worker.deliverOne(first.getId());
        assertThat(deliveries.findById(first.getId()).orElseThrow().getStatus()).isEqualTo(NotificationDeliveryStatus.SENT);
        makeDue(second.getId()); statuses.add(403); worker.deliverOne(second.getId());
        assertThat(member.telegramConnection().connected()).isFalse();
        assertThat(deliveries.findById(second.getId()).orElseThrow().getStatus()).isEqualTo(NotificationDeliveryStatus.DEAD);
    }

    /**
     * ФЛОУ: организатор получает в Telegram карточку мероприятия — фото, дату, место и ссылку; если Telegram
     * отклоняет картинку, то же сообщение приходит текстом.
     * ШАГИ: 1. Подключить Telegram организатору, создать очное событие с адресом, пояснением, временем и фото.
     * 2. Записать участника и доставить уведомление. 3. Создать онлайн-событие со ссылкой встречи, записать второго
     * участника, ответить на sendPhoto ошибкой 400 и доставить уведомление.
     * ПРОВЕРЯЕМ: первое сообщение — sendPhoto с фото мероприятия и подписью с названием, датой «d MMMM, 19:00–21:00»,
     * адресом с пояснением и ссылкой; второе — повтор через sendMessage с «Онлайн» без ссылки встречи, доставка SENT.
     * ПОЧЕМУ ВАЖНО: человек сразу видит, что, когда и где, а сломанная картинка не теряет уведомление.
     */
    @Test void telegramMessageIsAnEventCardWithTextFallback() {
        var author = api.newUser("telegramCardAuthor"); connect(author);
        var zone = ZoneId.of("Asia/Krasnoyarsk");
        var day = LocalDate.now(zone).plusDays(3);
        var start = day.atTime(19, 0).atZone(zone).toInstant();
        var offline = author.createEvent(EventForm.free().offline("ул. Ленина, 1", 56.01, 92.85)
                .with("locationNote", "Вход со двора").startsAt(start).endsAt(start.plus(Duration.ofHours(2))));
        var png = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=");
        author.addEventPhoto(offline.id(), png);
        api.newUser("telegramCardMember").joinEvent(offline.id());
        deliverLatest(author);
        var card = requests.poll();
        // Подпись: что, когда и где, плюс ссылка; картинка — загруженное фото мероприятия
        assertThat(card).startsWith("/bottest-token/sendPhoto")
                .contains("🔔 Новый участник", "«" + offline.title() + "»",
                        "📅 ", java.time.format.DateTimeFormatter.ofPattern("d MMMM", Locale.forLanguageTag("ru")).format(day) + ", 19:00–21:00",
                        "📍 ул. Ленина, 1 · Вход со двора", "https://sport.example/events/" + offline.id(),
                        "filename=\"event.png\"", "PNG");

        var online = author.createEvent(EventForm.free().online("https://private.example/room").privateDetails("Код 5521"));
        api.newUser("telegramCardOnline").joinEvent(online.id());
        statuses.add(400);
        var delivery = deliverLatest(author);
        // Сначала отклонённый sendPhoto (картинка вида спорта), затем то же сообщение текстом
        assertThat(requests.poll()).startsWith("/bottest-token/sendPhoto");
        assertThat(requests.poll()).startsWith("/bottest-token/sendMessage")
                .contains("📍 Онлайн", "https://sport.example/events/" + online.id())
                .doesNotContain("private.example", "5521");
        assertThat(deliveries.findById(delivery.getId()).orElseThrow().getStatus()).isEqualTo(NotificationDeliveryStatus.SENT);
    }

    /** Доставить в Telegram последнее уведомление пользователя; лимиты частоты снимаются. */
    private NotificationDelivery deliverLatest(Actor actor) {
        var task = telegramTask(actor.notifications().items().getFirst().id());
        requests.clear(); releaseLimits(); worker.deliverOne(task.getId());
        return task;
    }

    private long connect(Actor actor) {
        long chat = chats.incrementAndGet();
        api.guest().telegramUpdate("local-test-secret", update(chat, "/start " + token(actor.telegramLink())));
        return chat;
    }
    private static String token(TelegramLinkResponse link) { return link.url().substring(link.url().indexOf("start=") + 6); }
    private static TelegramUpdateRequest update(long chat, String text) {
        return new TelegramUpdateRequest(updates.incrementAndGet(), new TelegramUpdateRequest.Message(
                new TelegramUpdateRequest.User(chat, "person"), new TelegramUpdateRequest.Chat(chat, "private"), text), null);
    }
    private NotificationDelivery telegramTask(UUID notificationId) {
        return deliveries.findByNotificationIdIn(List.of(notificationId)).stream()
                .filter(d -> d.getChannel() == NotificationChannel.TELEGRAM).findFirst().orElseThrow();
    }
    private void releaseLimits() { rates.findAll().forEach(r -> { r.setAvailableAt(Instant.EPOCH); rates.saveAndFlush(r); }); }
    private void makeDue(UUID id) {
        var task = deliveries.findById(id).orElseThrow(); task.setNextAttemptAt(Instant.now().minusSeconds(1)); deliveries.saveAndFlush(task); releaseLimits();
    }
}
