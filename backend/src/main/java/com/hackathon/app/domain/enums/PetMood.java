package com.hackathon.app.domain.enums;

import java.util.Locale;
import com.fasterxml.jackson.annotation.JsonValue;

/** Вычисляемое настроение; JSON-коды совпадают с визуальным компонентом. */
public enum PetMood {
    /** Спокоен. */
    IDLE,
    /** Рад предстоящей встрече. */
    HAPPY,
    /** Удивлён новыми заявками. */
    SURPRISED,
    /** Ждёт решения. */
    THINKING,
    /** Переживает из-за отказа или отмены. */
    SAD,
    /** Рад одобрению заявки. */
    WINK,
    /** Обижен снятием своей встречи. */
    OFFENDED,
    /** Давно не было активности. */
    SLEEP;

    @JsonValue
    public String id() {
        return name().toLowerCase(Locale.ROOT);
    }
}
