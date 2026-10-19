-- Виды спорта пользователя и его уровень в каждом: из профиля строится лента «Для меня».
CREATE TABLE user_sports (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    sport_id   UUID        NOT NULL REFERENCES sports (id),
    level      VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_user_sports_user_sport UNIQUE (user_id, sport_id)
);
