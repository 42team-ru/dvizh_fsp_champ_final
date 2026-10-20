package com.hackathon.app.config;

import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Модерация текстов (docs/moderation.md). Словарь работает всегда; нейросеть (llama.cpp, OpenAI-совместимый API)
 * — если llm.enabled. autoHide — нейросеть сама скрывает явные угрозы, травлю и ненависть в сообщениях.
 */
@ConfigurationProperties("app.moderation")
public record ModerationProperties(@DefaultValue Llm llm, @DefaultValue("true") boolean autoHide,
        @DefaultValue("true") boolean schedulingEnabled, @DefaultValue("60s") Duration sweepInterval,
        @DefaultValue("5") int maxAttempts) {

    /** Сервер модели; ждём её до timeout, параллельно не больше concurrency запросов (модель на CPU). */
    public record Llm(@DefaultValue("false") boolean enabled, @DefaultValue("http://localhost:8091") URI url,
            @DefaultValue("qwen3-1.7b") String model, @DefaultValue("30s") Duration timeout,
            @DefaultValue("1") int concurrency) {}

    public ModerationProperties {
        if (maxAttempts < 1 || llm.concurrency() < 1) throw new IllegalArgumentException("Некорректные настройки модерации");
    }
}
