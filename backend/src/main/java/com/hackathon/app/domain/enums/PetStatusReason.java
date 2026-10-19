package com.hackathon.app.domain.enums;

/** Причина вычисленного состояния бобра. */
public enum PetStatusReason {
    /** Снята встреча организатора. */
    ORGANIZED_EVENT_MODERATED,
    /** Снята встреча участника. */
    REGISTERED_EVENT_MODERATED,
    /** Недавний отказ. */
    REGISTRATION_REJECTED,
    /** Недавнее одобрение. */
    REGISTRATION_APPROVED,
    /** Скоро встреча. */
    EVENT_SOON,
    /** Организатор ждёт решения заявок. */
    NEW_REQUESTS,
    /** Участник ждёт решения. */
    AWAITING_APPROVAL,
    /** Долгое отсутствие активности. */
    INACTIVE,
    /** Обычное состояние. */
    DEFAULT
}
