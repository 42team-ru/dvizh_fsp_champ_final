-- «Бублик подсказывает»: личное напоминание «пора выходить» на конкретное занятие или отказ от подсказки.
CREATE TABLE personal_reminders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    occurrence_id UUID NOT NULL REFERENCES event_occurrences (id) ON DELETE CASCADE,
    expected_start_at TIMESTAMPTZ NOT NULL,
    due_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SCHEDULED', 'SENT', 'CANCELLED', 'DISMISSED')),
    travel_minutes INTEGER,
    travel_mode VARCHAR(20) CHECK (travel_mode IN ('WALK', 'BUS', 'CAR', 'NONE')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_personal_reminders_user_occurrence UNIQUE (user_id, occurrence_id)
);
CREATE INDEX ix_personal_reminders_due ON personal_reminders (status, due_at);
