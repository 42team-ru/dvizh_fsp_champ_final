package com.hackathon.app.service;

import java.util.*;
import java.util.function.Predicate;
import com.hackathon.app.domain.entity.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.domain.mapper.NotificationMapper;
import com.hackathon.app.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Отключение отменяет уже созданную очередь, даже если канал успели включить до запуска обработчика. */
@Service
@RequiredArgsConstructor
public class NotificationCancellation {
    private final NotificationDeliveryRepository deliveries;
    private final NotificationRepository notifications;
    private final NotificationMapper mapper;
    private final DbTimeRepository dbTime;

    @Transactional
    public void settings(UUID userId, Set<NotificationChannel> channels, Set<NotificationCategory> categories) {
        cancel(userId, d -> !channels.contains(d.getChannel()) || notifications.findById(d.getNotificationId())
                .map(n -> !categories.contains(n.getCategory())).orElse(true));
    }
    @Transactional
    public void telegram(UUID userId) { cancel(userId, d -> d.getChannel() == NotificationChannel.TELEGRAM); }
    @Transactional
    public void reminders(UUID userId) {
        cancel(userId, d -> notifications.findById(d.getNotificationId()).map(n -> n.getType() == NotificationType.REMINDER).orElse(false));
    }
    private void cancel(UUID userId, Predicate<NotificationDelivery> disabled) {
        var active = EnumSet.of(NotificationDeliveryStatus.PENDING, NotificationDeliveryStatus.PROCESSING);
        for (var id : deliveries.activeIds(userId, active)) {
            var delivery = deliveries.lock(id).orElseThrow();
            if (active.contains(delivery.getStatus()) && disabled.test(delivery))
                mapper.finish(delivery, NotificationDeliveryStatus.SKIPPED, dbTime.now(), "Отключено пользователем", null);
        }
    }
}
