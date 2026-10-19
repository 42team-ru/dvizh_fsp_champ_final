package com.hackathon.app.service;

/** Безопасная ошибка провайдера: не содержит URI с секретом и пользовательского содержимого. */
public class NotificationTransportException extends RuntimeException {
    private final int status;
    private final long retryAfterSeconds;
    public NotificationTransportException(int status, long retryAfterSeconds) {
        super("Telegram HTTP " + status);
        this.status = status; this.retryAfterSeconds = retryAfterSeconds;
    }
    public int status() { return status; }
    public long retryAfterSeconds() { return retryAfterSeconds; }
    public boolean retryable() { return status == 429 || status >= 500; }
}
