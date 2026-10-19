package com.hackathon.app.util;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.experimental.UtilityClass;

/** PostgreSQL и H2 сохраняют время с микросекундами: сравнение до и после flush должно учитывать это округление. */
@UtilityClass
public class NotificationTimes {
    public static Instant stored(Instant value) {
        return value == null ? null : value.plusNanos(500).truncatedTo(ChronoUnit.MICROS);
    }
}
