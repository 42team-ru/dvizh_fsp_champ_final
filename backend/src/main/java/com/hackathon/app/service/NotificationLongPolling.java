package com.hackathon.app.service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import com.hackathon.app.domain.dto.NotificationPollResponse;
import com.hackathon.app.repository.NotificationInboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.async.DeferredResult;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

/** Ожидание без открытой транзакции и соединения БД; работает и при нескольких экземплярах приложения. */
@Service
@RequiredArgsConstructor
public class NotificationLongPolling {
    private final NotificationService notifications;
    private final NotificationInboxRepository inboxes;
    private final Map<UUID, CopyOnWriteArrayList<Waiter>> waiters = new ConcurrentHashMap<>();
    private record Waiter(long revision, DeferredResult<NotificationPollResponse> result) {}

    public DeferredResult<NotificationPollResponse> poll(UUID userId, long revision, int timeoutSeconds) {
        var result = new DeferredResult<NotificationPollResponse>(Math.clamp(timeoutSeconds, 0, 30) * 1000L);
        var snapshot = notifications.snapshot(userId, revision);
        if (snapshot.changed() || timeoutSeconds == 0) {
            result.setResult(snapshot);
            return result;
        }
        var waiting = new Waiter(revision, result);
        synchronized (waiters) {
            var list = waiters.computeIfAbsent(userId, ignored -> new CopyOnWriteArrayList<>());
            if (list.size() >= 10 || waiters.values().stream().mapToInt(List::size).sum() >= 10000)
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Слишком много ожидающих запросов");
            list.add(waiting);
        }
        result.onTimeout(() -> result.setResult(notifications.snapshot(userId, revision)));
        result.onCompletion(() -> remove(userId, waiting));
        result.onError(error -> remove(userId, waiting));
        // Повторная проверка закрывает гонку между первым чтением и регистрацией ожидания.
        snapshot = notifications.snapshot(userId, revision);
        if (snapshot.changed()) result.setResult(snapshot);
        return result;
    }

    @Scheduled(fixedDelay = 1000)
    public void tick() {
        var ids = new ArrayList<>(waiters.keySet());
        for (int start = 0; start < ids.size(); start += 500) {
            var batch = ids.subList(start, Math.min(start + 500, ids.size()));
            var revisions = new HashMap<UUID, Long>();
            inboxes.findByUserIdIn(batch).forEach(i -> revisions.put(i.getUserId(), i.getRevision()));
            for (var userId : batch) {
                var pending = waiters.get(userId);
                if (pending == null) continue;
                for (var waiter : pending) {
                    if (waiter.result().isSetOrExpired()) remove(userId, waiter);
                    else if (revisions.getOrDefault(userId, 0L) != waiter.revision())
                        waiter.result().setResult(notifications.snapshot(userId, waiter.revision()));
                }
            }
        }
    }

    private void remove(UUID userId, Waiter waiter) {
        synchronized (waiters) {
            var list = waiters.get(userId);
            if (list != null) {
                list.remove(waiter);
                if (list.isEmpty()) waiters.remove(userId);
            }
        }
    }
}
