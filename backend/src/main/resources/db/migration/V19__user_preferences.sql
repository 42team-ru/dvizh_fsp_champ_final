-- Предпочтения онбординга; существующие пользователи получают дефолты при чтении API.
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL CHECK (level IN ('BEGINNER', 'AMATEUR', 'ADVANCED', 'PRO')),
    daytime VARCHAR(20) NOT NULL CHECK (daytime IN ('MORNING', 'DAY', 'EVENING')),
    radius_km INTEGER NOT NULL CHECK (radius_km BETWEEN 1 AND 20),
    reminders BOOLEAN NOT NULL,
    nearby BOOLEAN NOT NULL,
    cheer BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_user_preferences_user UNIQUE (user_id)
);

CREATE TABLE user_preference_days (
    preferences_id UUID NOT NULL REFERENCES user_preferences (id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN
        ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    PRIMARY KEY (preferences_id, day_of_week)
);
