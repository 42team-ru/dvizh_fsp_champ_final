package com.hackathon.app.config;

import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Модерация текстов (docs/moderation.md). Словарь работает всегда; нейросеть (llama.cpp, OpenAI-совместимый API)
 * — если llm.enabled, классификатор токсичности (text-embeddings-inference) — если classifier.enabled.
 * autoHide — сообщение скрывается само, если серьёзное нарушение видят минимум два источника из трёх.
 */
@ConfigurationProperties("app.moderation")
public record ModerationProperties(@DefaultValue Llm llm, @DefaultValue Classifier classifier,
        @DefaultValue("true") boolean autoHide,
        @DefaultValue("true") boolean schedulingEnabled, @DefaultValue("60s") Duration sweepInterval,
        @DefaultValue("5") int maxAttempts) {

    /** Сервер модели; ждём её до timeout, параллельно не больше concurrency запросов (модель на CPU). */
    public record Llm(@DefaultValue("false") boolean enabled, @DefaultValue("http://localhost:8091") URI url,
            @DefaultValue("qwen3.5-0.8b") String model, @DefaultValue("30s") Duration timeout,
            @DefaultValue("1") int concurrency) {}

    /** Классификатор токсичности rubert-tiny-toxicity: отвечает за миллисекунды, ждём его до timeout. */
    public record Classifier(@DefaultValue("false") boolean enabled, @DefaultValue("http://localhost:8093") URI url,
            @DefaultValue("5s") Duration timeout) {}

    public ModerationProperties {
        if (maxAttempts < 1 || llm.concurrency() < 1) throw new IllegalArgumentException("Некорректные настройки модерации");
    }
}
