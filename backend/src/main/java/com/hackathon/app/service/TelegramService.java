package com.hackathon.app.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.temporal.ChronoUnit;
import java.util.*;
import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.domain.dto.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.domain.exception.*;
import com.hackathon.app.domain.mapper.NotificationMapper;
import com.hackathon.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Привязка только одноразовой ссылкой и только из личного чата. Ответы бота также сохраняются в outbox. */
@Service
@RequiredArgsConstructor
public class TelegramService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final jakarta.persistence.EntityManager entityManager;
    private final NotificationCancellation cancellation;
    private final TelegramBindingRepository bindings;
    private final TelegramLinkTokenRepository tokens;
    private final TelegramUpdateReceiptRepository receipts;
    private final TelegramRateLimitRepository limits;
    private final NotificationSettingsRepository settings;
    private final NotificationDeliveryRepository deliveries;
    private final AppUserRepository users;
    private final NotificationMapper mapper;
    private final NotificationProperties properties;
    private final DbTimeRepository dbTime;

    @Transactional(readOnly = true)
    public TelegramConnectionResponse connection(UUID userId) {
        var binding = bindings.findByUserId(userId).orElse(null);
        return new TelegramConnectionResponse(properties.telegram().enabled(), binding != null,
                binding == null ? null : binding.getUsername());
    }

    @Transactional
    public TelegramLinkResponse link(UUID userId) {
        if (!properties.telegram().enabled()) throw new ConflictException("Telegram пока недоступен");
        users.findByIdForUpdate(userId).filter(u -> u.isActive()).orElseThrow();
        var now = dbTime.now();
        tokens.findByUserIdAndUsedAtIsNull(userId).forEach(t -> mapper.useToken(t, now));
        var bytes = new byte[32]; RANDOM.nextBytes(bytes);
        var token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var expires = now.plus(10, ChronoUnit.MINUTES);
        tokens.save(mapper.linkToken(userId, hash(token), expires));
        return new TelegramLinkResponse("https://t.me/" + properties.telegram().username() + "?start=" + token, expires);
    }

    @Transactional
    public void disconnect(UUID userId) {
        users.findByIdForUpdate(userId).orElseThrow();
        cancellation.telegram(userId);
        bindings.findByUserId(userId).ifPresent(bindings::delete);
        var now = dbTime.now();
        tokens.findByUserIdAndUsedAtIsNull(userId).forEach(t -> mapper.useToken(t, now));
        var prefs = settings.findByUserId(userId).orElse(null);
        if (prefs != null) {
            var enabled = new HashSet<>(prefs.getChannels()); enabled.remove(NotificationChannel.TELEGRAM);
            mapper.settings(prefs, enabled, Set.copyOf(prefs.getCategories()));
        }
    }

    @Transactional
    public void accept(String secret, TelegramUpdateRequest update) {
        if (!properties.telegram().enabled()) throw new NoSuchElementException("Telegram пока недоступен");
        if (secret == null || !MessageDigest.isEqual(secret.getBytes(StandardCharsets.UTF_8),
                properties.telegram().webhookSecret().getBytes(StandardCharsets.UTF_8)))
            throw new ForbiddenException("Неверный секрет webhook");
        if (update.updateId() == null) throw new BadRequestException("Не указан update_id");
        // Общая строка сериализует повторы update и конкурирующие подключения одного Telegram.
        limits.lock("bot").orElseThrow();
        if (receipts.existsByUpdateId(update.updateId())) return;
        if (update.myChatMember() != null && update.myChatMember().chat() != null
                && "private".equals(update.myChatMember().chat().type()) && update.myChatMember().newChatMember() != null
                && "kicked".equals(update.myChatMember().newChatMember().status())) {
            bindings.findByChatId(update.myChatMember().chat().id()).ifPresent(b -> disconnect(b.getUserId()));
        }
        var message = update.message();
        if (message != null && message.chat() != null && message.from() != null
                && "private".equals(message.chat().type()) && message.chat().id() != null
                && message.from().id() != null && message.chat().id().equals(message.from().id())) {
            String text = command(message);
            var now = dbTime.now();
            deliveries.save(mapper.delivery(null, null, NotificationChannel.TELEGRAM, null, message.chat().id(), text,
                    "telegram-command:" + update.updateId(), now, now.plus(1, ChronoUnit.DAYS)));
        }
        receipts.save(mapper.receipt(update.updateId()));
    }

    private String command(TelegramUpdateRequest.Message message) {
        var text = message.text() == null ? "" : message.text().trim();
        var parts = text.split("\\s+", 2);
        var command = parts[0].split("@", 2)[0];
        var binding = bindings.findByTelegramUserId(message.from().id()).orElse(null);
        if ("/stop".equals(command)) {
            if (binding != null) disconnect(binding.getUserId());
            return "Telegram отключён. Подключить снова можно в настройках сайта.";
        }
        if ("/status".equals(command)) return binding == null ? "Аккаунт не подключён. Откройте настройки сайта." : "Аккаунт подключён. Уведомления включаются в настройках сайта.";
        if (!"/start".equals(command) || parts.length != 2) return "Подключите аккаунт по одноразовой ссылке из настроек сайта. /status — статус, /stop — отключить.";
        var token = tokens.findByTokenHash(hash(parts[1])).orElse(null);
        var now = dbTime.now();
        if (token == null || token.getUsedAt() != null || !token.getExpiresAt().isAfter(now))
            return "Ссылка недействительна или устарела. Получите новую в настройках сайта.";
        var user = users.findByIdForUpdate(token.getUserId()).orElse(null);
        if (user == null || !user.isActive()) return "Аккаунт недоступен.";
        // После блокировки повторно проверяем токен: параллельная выдача могла отозвать ссылку.
        entityManager.refresh(token);
        if (token.getUsedAt() != null || !token.getExpiresAt().isAfter(now)) return "Получите новую ссылку в настройках сайта.";
        if (binding != null && !binding.getUserId().equals(token.getUserId()))
            return "Telegram уже подключён к другому аккаунту. Сначала отключите его командой /stop.";
        var existing = bindings.findByUserId(token.getUserId()).orElse(null);
        if (existing != null && !existing.getTelegramUserId().equals(message.from().id()))
            return "К аккаунту уже подключён другой Telegram. Сначала отключите его на сайте.";
        mapper.useToken(token, now);
        if (existing == null) bindings.saveAndFlush(mapper.binding(token.getUserId(), message.from().id(), message.chat().id(), message.from().username()));
        var prefs = settings.findByUserId(token.getUserId()).orElseGet(() -> mapper.settings(user.getId(), Set.of(), EnumSet.allOf(NotificationCategory.class)));
        var channels = new HashSet<>(prefs.getChannels()); channels.add(NotificationChannel.TELEGRAM);
        mapper.settings(prefs, channels, Set.copyOf(prefs.getCategories())); settings.save(prefs);
        return "Telegram подключён. Здесь будут уведомления со ссылками на мероприятия. /stop — отключить.";
    }

    @Transactional
    public void blocked(UUID userId, UUID bindingId) {
        users.findByIdForUpdate(userId).orElseThrow();
        if (bindings.findByUserId(userId).filter(b -> b.getId().equals(bindingId)).isPresent()) disconnect(userId);
    }

    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
}
