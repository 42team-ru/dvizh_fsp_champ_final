package com.hackathon.app.service;

import com.hackathon.app.config.NotificationProperties;
import com.hackathon.app.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.util.List;

/** Оркестрация фоновых задач. Каждый предметный шаг выполняется отдельной короткой транзакцией сервиса. */
@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationJobs {
    private final NotificationProperties properties;
    private final NotificationReminderService reminders;
    private final NotificationDeliveryService deliveries;
    private final NotificationMaintenance maintenance;
    private final TelegramService telegram;
    private final EventRepository events;
    private final List<NotificationTransport> transports;

    @EventListener(ApplicationReadyEvent.class)
    public void initialize() {
        maintenance.initialize();
        if (properties.schedulingEnabled()) events.findAll().stream().map(e -> e.getId()).sorted().forEach(reminders::synchronize);
    }

    @Scheduled(fixedDelay = 30000, initialDelay = 30000)
    public void remind() {
        if (!properties.schedulingEnabled()) return;
        for (var id : reminders.due()) {
            try { reminders.process(id); }
            catch (Exception failure) { log.error("Reminder processing failed: id={}, errorType={}", id, failure.getClass().getSimpleName()); }
        }
    }

    @Scheduled(fixedDelay = 100, initialDelay = 1000)
    public void deliver() {
        if (!properties.schedulingEnabled()) return;
        for (var id : deliveries.due()) {
            try { deliverOne(id); }
            catch (Exception failure) { log.error("Delivery processing failed: id={}, errorType={}", id, failure.getClass().getSimpleName()); }
        }
    }

    /** Также используется тестами с настоящим локальным HTTP-стабом провайдера. */
    public void deliverOne(java.util.UUID id) {
        var claim = deliveries.claim(id);
        if (claim == null) return;
        try {
            var transport = transports.stream().filter(t -> t.channel() == claim.channel()).findFirst().orElseThrow();
            deliveries.complete(claim, transport.send(claim.chatId(), claim.text()));
        } catch (NotificationTransportException error) {
            deliveries.failed(claim, error);
            if (error.status() == 403 && claim.userId() != null) telegram.blocked(claim.userId(), claim.bindingId());
        } catch (RuntimeException error) {
            deliveries.failed(claim, new NotificationTransportException(502, 5));
        }
    }

    @Scheduled(fixedDelay = 10000, initialDelay = 10000)
    public void metrics() { if (properties.schedulingEnabled()) maintenance.measure(); }

    @Scheduled(cron = "0 0 3 * * *", zone = "UTC")
    public void cleanup() {
        if (!properties.schedulingEnabled()) return;
        maintenance.expiredUsers().forEach(maintenance::cleanUser);
        maintenance.cleanTransportHistory();
    }
}
