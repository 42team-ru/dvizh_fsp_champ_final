package com.hackathon.app.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.enums.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/**
 * Telegram Bot API через JDK HTTP; токен и тело ответа никогда не включаются в диагностику.
 * С картинкой сообщение уходит через sendPhoto (текст — подписью). Если картинку не удалось прочитать
 * или Telegram её не принял (400), то же сообщение отправляется текстом: картинка не должна терять уведомление.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramTransport implements NotificationTransport {
    private final NotificationProperties properties;
    private final ObjectMapper json;
    private final FileStorage storage;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    @Override public NotificationChannel channel() { return NotificationChannel.TELEGRAM; }

    @Override public Result send(Long chatId, String text, Photo photo) {
        if (!properties.telegram().enabled()) throw new NotificationTransportException(503, 30);
        var image = photo == null ? null : read(photo);
        if (image != null) {
            try {
                return sendPhoto(chatId, text, image, photo.contentType());
            } catch (NotificationTransportException failure) {
                if (failure.status() != 400) throw failure;
                log.warn("Telegram rejected photo, sending text instead: chatId={}", chatId);
            }
        }
        return sendMessage(chatId, text);
    }

    private Result sendMessage(Long chatId, String text) {
        var body = json.writeValueAsString(Map.of(
                "chat_id", chatId, "text", text, "link_preview_options", Map.of("is_disabled", true)));
        return call("sendMessage", "application/json", HttpRequest.BodyPublishers.ofString(body));
    }

    private Result sendPhoto(Long chatId, String caption, byte[] image, String contentType) {
        var boundary = "----sport" + UUID.randomUUID().toString().replace("-", "");
        var form = new ByteArrayOutputStream();
        field(form, boundary, "chat_id", Long.toString(chatId));
        field(form, boundary, "caption", caption);
        var extension = contentType == null ? "jpg" : contentType.substring(contentType.indexOf('/') + 1).replace("jpeg", "jpg");
        form.writeBytes(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"photo\"; filename=\"event." + extension
                + "\"\r\nContent-Type: " + (contentType == null ? "image/jpeg" : contentType) + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        form.writeBytes(image);
        form.writeBytes(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return call("sendPhoto", "multipart/form-data; boundary=" + boundary,
                HttpRequest.BodyPublishers.ofByteArray(form.toByteArray()));
    }

    private Result call(String method, String contentType, HttpRequest.BodyPublisher body) {
        try {
            var uri = URI.create(properties.telegram().apiUrl().toString().replaceAll("/$", "")
                    + "/bot" + properties.telegram().token() + "/" + method);
            var request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10))
                    .header("Content-Type", contentType).POST(body).build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            var answer = json.readTree(response.body());
            if (response.statusCode() != 200 || !answer.path("ok").asBoolean()) {
                int status = answer.path("error_code").asInt(response.statusCode() == 200 ? 502 : response.statusCode());
                throw new NotificationTransportException(status, Math.max(0, answer.path("parameters").path("retry_after").asLong(0)));
            }
            return new Result(NotificationDeliveryStatus.SENT, answer.path("result").path("message_id").asLong());
        } catch (NotificationTransportException failure) { throw failure; }
        catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt(); throw new NotificationTransportException(503, 5);
        } catch (Exception failure) { throw new NotificationTransportException(502, 5); }
    }

    /** Байты картинки; при ошибке хранилища — null, и сообщение уйдёт текстом. */
    private byte[] read(Photo photo) {
        try (var in = photo.objectKey() != null ? storage.get(photo.objectKey()) : new ClassPathResource(photo.resource()).getInputStream()) {
            return in.readAllBytes();
        } catch (IOException | RuntimeException failure) {
            log.warn("Notification photo unavailable, sending text: errorType={}", failure.getClass().getSimpleName());
            return null;
        }
    }

    private static void field(ByteArrayOutputStream form, String boundary, String name, String value) {
        form.writeBytes(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"" + name
                + "\"\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" + value + "\r\n").getBytes(StandardCharsets.UTF_8));
    }
}
