-- Повторяющиеся мероприятия (серии). Мероприятие одно, по правилам расписания строятся занятия:
-- по ним работают фильтры по датам, на них участники серии отмечаются «приду».
ALTER TABLE events ADD COLUMN recurring BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE events ADD COLUMN time_zone VARCHAR(64);
ALTER TABLE events ADD COLUMN series_start_date DATE;
ALTER TABLE events ADD COLUMN series_end_date DATE;
ALTER TABLE events ADD CONSTRAINT ck_events_series CHECK (NOT recurring
    OR (time_zone IS NOT NULL AND series_start_date IS NOT NULL AND series_end_date IS NOT NULL));

-- Правила расписания (RRULE): у каждого своё первое занятие (местное время) и длительность
CREATE TABLE event_schedule_rules (
    id               UUID PRIMARY KEY,
    event_id         UUID         NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    sort_order       INTEGER      NOT NULL,
    first_start      TIMESTAMP    NOT NULL,
    duration_minutes INTEGER      NOT NULL,
    rrule            VARCHAR(500) NOT NULL,
    created_at       TIMESTAMPTZ  NOT NULL,
    updated_at       TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_event_schedule_rules_order UNIQUE (event_id, sort_order)
);

-- Занятия: у разового мероприятия одно (SINGLE), у серии — по правилам (RULE) и добавленные вручную (EXTRA)
CREATE TABLE event_occurrences (
    id                UUID PRIMARY KEY,
    event_id          UUID          NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    start_at          TIMESTAMPTZ   NOT NULL,
    end_at            TIMESTAMPTZ,
    original_start_at TIMESTAMPTZ,
    source            VARCHAR(20)   NOT NULL,
    status            VARCHAR(20)   NOT NULL,
    cancel_reason     VARCHAR(1000),
    cancelled_at      TIMESTAMPTZ,
    cancelled_by_id   UUID REFERENCES users (id),
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_event_occurrences_original UNIQUE (event_id, original_start_at)
);
CREATE INDEX ix_event_occurrences_start ON event_occurrences (start_at);
CREATE INDEX ix_event_occurrences_event_start ON event_occurrences (event_id, start_at);

-- Отметки «приду» участников серии на конкретные занятия
CREATE TABLE occurrence_attendances (
    id            UUID PRIMARY KEY,
    occurrence_id UUID        NOT NULL REFERENCES event_occurrences (id) ON DELETE CASCADE,
    event_id      UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_occurrence_attendances_user UNIQUE (occurrence_id, user_id)
);
CREATE INDEX ix_occurrence_attendances_event_user ON occurrence_attendances (event_id, user_id);
CREATE INDEX ix_occurrence_attendances_user ON occurrence_attendances (user_id);

-- Уже созданные мероприятия разовые: каждому одно занятие с его временем
INSERT INTO event_occurrences (id, event_id, start_at, end_at, source, status, created_at, updated_at)
SELECT gen_random_uuid(), id, start_at, end_at, 'SINGLE', 'SCHEDULED', now(), now() FROM events;
