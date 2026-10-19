-- Кворум: «состоится, если наберём N». N — у мероприятия; у серии считается на каждое занятие (по отметкам),
-- у разового — по подтверждённым записям. Организатор может подтвердить занятие и раньше.
ALTER TABLE events ADD COLUMN min_participants INTEGER;
ALTER TABLE events ADD CONSTRAINT ck_events_min_participants
    CHECK (min_participants IS NULL OR (min_participants >= 1 AND (capacity IS NULL OR min_participants <= capacity)));

ALTER TABLE event_occurrences ADD COLUMN confirmed_at TIMESTAMPTZ;
ALTER TABLE event_occurrences ADD COLUMN confirmed_by_id UUID REFERENCES users (id);
