package com.hackathon.app.domain.enums;

/** Наличие будущих запланированных занятий мероприятия. */
public enum TimeScope {
    /** Есть хотя бы одно будущее занятие SCHEDULED. */
    UPCOMING,
    /** Будущих занятий SCHEDULED нет. */
    PAST
}
