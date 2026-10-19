package com.hackathon.app.service;

import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Map;
import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.enums.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/** Telegram Bot API через JDK HTTP; токен и тело ответа никогда не включаются в диагностику. */
@Service
@RequiredArgsConstructor
public class TelegramTransport implements NotificationTransport {
    private final NotificationProperties properties;
    private final ObjectMapper json;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    @Override public NotificationChannel channel() { return NotificationChannel.TELEGRAM; }
    @Override public Result send(Long chatId, String text) {
        if (!properties.telegram().enabled()) throw new NotificationTransportException(503, 30);
        try {
            var uri = URI.create(properties.telegram().apiUrl().toString().replaceAll("/$", "")
                    + "/bot" + properties.telegram().token() + "/sendMessage");
            var request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of(
                            "chat_id", chatId, "text", text, "link_preview_options", Map.of("is_disabled", true))))).build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            var body = json.readTree(response.body());
            if (response.statusCode() != 200 || !body.path("ok").asBoolean()) {
                int status = body.path("error_code").asInt(response.statusCode() == 200 ? 502 : response.statusCode());
                throw new NotificationTransportException(status, Math.max(0, body.path("parameters").path("retry_after").asLong(0)));
            }
            return new Result(NotificationDeliveryStatus.SENT, body.path("result").path("message_id").asLong());
        } catch (NotificationTransportException failure) { throw failure; }
        catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt(); throw new NotificationTransportException(503, 5);
        } catch (Exception failure) { throw new NotificationTransportException(502, 5); }
    }
}
